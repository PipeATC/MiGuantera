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
  getAllDocuments,
  saveVehicle as dbSaveVehicle,
  deleteVehicle as dbDeleteVehicle,
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

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [vehicles, setVehicles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [driverName, setDriverName] = useState('');
  const [warnDays, setWarnDaysState] = useState(DEFAULT_WARN_DAYS);
  const [activeVehicleId, setActiveVehicleId] = useState(null);
  // Bloqueo de seguridad (biometría / PIN del dispositivo)
  const [securityLock, setSecurityLockState] = useState(null); // { enabled, credentialId }
  const [locked, setLocked] = useState(false);

  const refresh = useCallback(async () => {
    const [v, d] = await Promise.all([getAllVehicles(), getAllDocuments()]);
    setVehicles(v);
    setDocuments(d);
    return { vehicles: v, documents: d };
  }, []);

  // Carga inicial
  useEffect(() => {
    (async () => {
      const [v, d, name, wd, sl] = await Promise.all([
        getAllVehicles(),
        getAllDocuments(),
        getSetting('driverName', ''),
        getSetting('warnDays', DEFAULT_WARN_DAYS),
        getSetting('securityLock', null),
      ]);
      setVehicles(v);
      setDocuments(d);
      setDriverName(name || '');
      setWarnDaysState(Number(wd) || DEFAULT_WARN_DAYS);
      setSecurityLockState(sl);
      setLocked(!!(sl && sl.enabled)); // arrancar bloqueado si está activo
      setActiveVehicleId((prev) => prev || (v[0] ? v[0].id : null));
      setLoading(false);
    })();
  }, []);

  // Re-bloquear al volver a segundo plano (PWA): exige verificar al reabrir.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setSecurityLockState((sl) => {
          if (sl && sl.enabled) setLocked(true);
          return sl;
        });
      }
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

  // --- Bloqueo de seguridad ---
  const unlock = useCallback(() => setLocked(false), []);

  const enableSecurityLock = useCallback(async () => {
    // Registra la credencial de plataforma (dispara biometría / PIN).
    const { credentialId } = await registerDeviceCredential({
      userName: driverName || 'MiGuantera',
    });
    const value = { enabled: true, credentialId, method: 'webauthn', createdAt: Date.now() };
    await setSetting('securityLock', value);
    setSecurityLockState(value);
    setLocked(false); // recién configurado: queda desbloqueado
    return value;
  }, [driverName]);

  const disableSecurityLock = useCallback(async () => {
    await setSetting('securityLock', null);
    setSecurityLockState(null);
    setLocked(false);
  }, []);

  // Índices derivados
  const documentsByVehicle = useMemo(() => {
    const map = new Map();
    for (const doc of documents) {
      const key = doc.vehicleId || '__driver__';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(doc);
    }
    return map;
  }, [documents]);

  const activeVehicle = useMemo(
    () => vehicles.find((v) => v.id === activeVehicleId) || null,
    [vehicles, activeVehicleId]
  );

  const pendingReminders = useMemo(
    () => computePendingReminders(documents, vehicles, warnDays),
    [documents, vehicles, warnDays]
  );

  const value = {
    loading,
    vehicles,
    documents,
    documentsByVehicle,
    activeVehicle,
    activeVehicleId,
    setActiveVehicleId,
    driverName,
    warnDays,
    pendingReminders,
    securityLock,
    locked,
    unlock,
    enableSecurityLock,
    disableSecurityLock,
    refresh,
    saveVehicle,
    removeVehicle,
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
