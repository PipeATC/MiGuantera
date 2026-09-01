import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  getAllVehicles,
  getAllDrivers,
  getAllDocuments,
  saveVehicle as dbSaveVehicle,
  deleteVehicle as dbDeleteVehicle,
  saveDriver as dbSaveDriver,
  deleteDriver as dbDeleteDriver,
  saveDocument as dbSaveDocument,
  deleteDocument as dbDeleteDocument,
  getSetting,
  setSetting,
} from '../db/database.js';
import { DEFAULT_WARN_DAYS } from '../utils/dateUtils.js';
import {
  computePendingReminders,
  fireReminderNotifications,
} from '../utils/reminders.js';
import { registerDeviceCredential } from '../utils/deviceAuth.js';
import { createPinConfig, verifyPinConfig } from '../utils/pinAuth.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [driverName, setDriverName] = useState('');
  const [warnDays, setWarnDaysState] = useState(DEFAULT_WARN_DAYS);
  const [activeVehicleId, setActiveVehicleId] = useState(null);
  const [activeDriverId, setActiveDriverId] = useState(null);
  // Autenticación: PIN local obligatorio + biometría opcional (WebAuthn).
  const [pinConfig, setPinConfig] = useState(null); // { salt, hash, createdAt } | null
  const [authed, setAuthed] = useState(false); // ¿desbloqueada esta sesión?
  const [securityLock, setSecurityLockState] = useState(null); // { enabled, credentialId }
  // Sugerencias descartables de la Home (biometría, notificaciones, respaldo).
  const [dismissedTips, setDismissedTips] = useState({});

  const refresh = useCallback(async () => {
    const [v, dr, d] = await Promise.all([
      getAllVehicles(),
      getAllDrivers(),
      getAllDocuments(),
    ]);
    setVehicles(v);
    setDrivers(dr);
    setDocuments(d);
    return { vehicles: v, drivers: dr, documents: d };
  }, []);

  // Carga inicial
  useEffect(() => {
    (async () => {
      const [v, dr, d, name, wd, sl, pin, tips] = await Promise.all([
        getAllVehicles(),
        getAllDrivers(),
        getAllDocuments(),
        getSetting('driverName', ''),
        getSetting('warnDays', DEFAULT_WARN_DAYS),
        getSetting('securityLock', null),
        getSetting('pinConfig', null),
        getSetting('dismissedTips', {}),
      ]);
      setVehicles(v);
      setDrivers(dr);
      setDocuments(d);
      setDriverName(name || '');
      setWarnDaysState(Number(wd) || DEFAULT_WARN_DAYS);
      setSecurityLockState(sl);
      setPinConfig(pin);
      setDismissedTips(tips || {});
      // Siempre arranca sin autenticar: exige crear/ingresar el PIN.
      setAuthed(false);
      setActiveVehicleId((prev) => prev || (v[0] ? v[0].id : null));
      setActiveDriverId((prev) => prev || (dr[0] ? dr[0].id : null));
      setLoading(false);
    })();
  }, []);

  // Re-bloquear al volver a segundo plano (PWA): exige reautenticar al reabrir.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') setAuthed(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Dispara recordatorios locales una vez cargados los datos
  useEffect(() => {
    if (loading) return;
    const pending = computePendingReminders(documents, vehicles, warnDays);
    fireReminderNotifications(pending);
  }, [loading, documents, vehicles, warnDays]);

  const saveVehicle = useCallback(async (vehicle) => {
    const rec = await dbSaveVehicle(vehicle);
    await refresh();
    setActiveVehicleId((prev) => prev || rec.id);
    return rec;
  }, [refresh]);

  const removeVehicle = useCallback(async (id) => {
    await dbDeleteVehicle(id);
    const { vehicles: v } = await refresh();
    setActiveVehicleId((prev) => (prev === id ? (v[0] ? v[0].id : null) : prev));
  }, [refresh]);

  const saveDriver = useCallback(async (driver) => {
    const rec = await dbSaveDriver(driver);
    await refresh();
    setActiveDriverId((prev) => prev || rec.id);
    return rec;
  }, [refresh]);

  const removeDriver = useCallback(async (id) => {
    await dbDeleteDriver(id);
    const { drivers: dr } = await refresh();
    setActiveDriverId((prev) => (prev === id ? (dr[0] ? dr[0].id : null) : prev));
  }, [refresh]);

  const saveDocument = useCallback(async (doc) => {
    const rec = await dbSaveDocument(doc);
    await refresh();
    return rec;
  }, [refresh]);

  const removeDocument = useCallback(async (id) => {
    await dbDeleteDocument(id);
    await refresh();
  }, [refresh]);

  const updateDriverName = useCallback(async (name) => {
    setDriverName(name);
    await setSetting('driverName', name);
  }, []);

  const updateWarnDays = useCallback(async (days) => {
    const val = Number(days) || DEFAULT_WARN_DAYS;
    setWarnDaysState(val);
    await setSetting('warnDays', val);
  }, []);

  // --- Autenticación con PIN ---
  const createPin = useCallback(async (pin) => {
    const cfg = await createPinConfig(pin);
    await setSetting('pinConfig', cfg);
    setPinConfig(cfg);
    setAuthed(true); // recién creado: queda desbloqueado
    return cfg;
  }, []);

  const verifyPin = useCallback(async (pin) => {
    const ok = await verifyPinConfig(pin, pinConfig);
    if (ok) setAuthed(true);
    return ok;
  }, [pinConfig]);

  const changePin = useCallback(async (currentPin, newPin) => {
    const ok = await verifyPinConfig(currentPin, pinConfig);
    if (!ok) return false;
    const cfg = await createPinConfig(newPin);
    await setSetting('pinConfig', cfg);
    setPinConfig(cfg);
    return true;
  }, [pinConfig]);

  // Desbloqueo por biometría (tras verificación WebAuthn exitosa).
  const unlock = useCallback(() => setAuthed(true), []);
  const lock = useCallback(() => setAuthed(false), []);

  // --- Biometría opcional (WebAuthn) ---
  const enableSecurityLock = useCallback(async () => {
    // Registra la credencial de plataforma (dispara biometría / PIN del sistema).
    const { credentialId } = await registerDeviceCredential({
      userName: driverName || 'MiGuantera',
    });
    const value = { enabled: true, credentialId, method: 'webauthn', createdAt: Date.now() };
    await setSetting('securityLock', value);
    setSecurityLockState(value);
    return value;
  }, [driverName]);

  const disableSecurityLock = useCallback(async () => {
    await setSetting('securityLock', null);
    setSecurityLockState(null);
  }, []);

  // --- Sugerencias descartables ---
  const dismissTip = useCallback(async (key) => {
    setDismissedTips((prev) => {
      const next = { ...prev, [key]: true };
      setSetting('dismissedTips', next);
      return next;
    });
  }, []);

  // Índices derivados
  const documentsByVehicle = useMemo(() => {
    const map = new Map();
    for (const doc of documents) {
      if (!doc.vehicleId) continue;
      if (!map.has(doc.vehicleId)) map.set(doc.vehicleId, []);
      map.get(doc.vehicleId).push(doc);
    }
    return map;
  }, [documents]);

  const documentsByDriver = useMemo(() => {
    const map = new Map();
    for (const doc of documents) {
      if (!doc.driverId) continue;
      if (!map.has(doc.driverId)) map.set(doc.driverId, []);
      map.get(doc.driverId).push(doc);
    }
    return map;
  }, [documents]);

  const activeVehicle = useMemo(
    () => vehicles.find((v) => v.id === activeVehicleId) || null,
    [vehicles, activeVehicleId]
  );

  const activeDriver = useMemo(
    () => drivers.find((d) => d.id === activeDriverId) || null,
    [drivers, activeDriverId]
  );

  const pendingReminders = useMemo(
    () => computePendingReminders(documents, vehicles, warnDays),
    [documents, vehicles, warnDays]
  );

  const value = {
    loading,
    vehicles,
    drivers,
    documents,
    documentsByVehicle,
    documentsByDriver,
    activeVehicle,
    activeVehicleId,
    setActiveVehicleId,
    activeDriver,
    activeDriverId,
    setActiveDriverId,
    driverName,
    warnDays,
    pendingReminders,
    // Autenticación
    pinSet: !!pinConfig,
    authed,
    createPin,
    verifyPin,
    changePin,
    unlock,
    lock,
    // Biometría opcional
    securityLock,
    enableSecurityLock,
    disableSecurityLock,
    // Sugerencias
    dismissedTips,
    dismissTip,
    refresh,
    saveVehicle,
    removeVehicle,
    saveDriver,
    removeDriver,
    saveDocument,
    removeDocument,
    updateDriverName,
    updateWarnDays,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
