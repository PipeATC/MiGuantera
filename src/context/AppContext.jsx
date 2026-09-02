import {
  createContext,
  useContext,
  useEffect,
  useRef,
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
  clearAllData,
  getSetting,
  setSetting,
} from '../db/database.js';
import { DEFAULT_WARN_DAYS } from '../utils/dateUtils.js';
import {
  computePendingReminders,
  fireReminderNotifications,
} from '../utils/reminders.js';
import { registerDeviceCredential } from '../utils/deviceAuth.js';
import {
  createPinConfig,
  unlockWithPin,
  rewrapPinConfig,
  isEncryptedPinConfig,
} from '../utils/pinAuth.js';
import { encryptBlob, decryptToBlob, generateDEK, sha256Hex } from '../utils/crypto.js';
import {
  serializeBackup,
  encryptBackup,
  decryptBackup,
  isEncryptedBackup,
  validateBackup,
  parseBackupFile,
  base64ToBlob,
} from '../utils/backup.js';
import { downloadBlob } from '../utils/fileUtils.js';

const AppContext = createContext(null);

const DRIVER_DOC_KEYS = new Set(['cedula', 'licencia']);

/** Descifra un registro de documento a la forma que usa la UI (con Blobs). */
async function decryptDoc(rec, dek) {
  let fileBlob = null;
  let backBlob = null;
  if (rec.fileEnc && dek) fileBlob = await decryptToBlob(rec.fileEnc, dek, rec.fileType);
  else if (rec.fileBlob) fileBlob = rec.fileBlob; // legado en claro
  if (rec.backEnc && dek) backBlob = await decryptToBlob(rec.backEnc, dek, rec.backFileType);
  else if (rec.backBlob) backBlob = rec.backBlob; // legado en claro
  return { ...rec, fileBlob, backBlob };
}

/** Construye el registro cifrado a partir de un documento con Blobs. */
async function encryptDoc(doc, dek) {
  const fileEnc = doc.fileBlob ? await encryptBlob(doc.fileBlob, dek) : null;
  const backEnc = doc.backBlob ? await encryptBlob(doc.backBlob, dek) : null;
  return {
    id: doc.id,
    vehicleId: doc.vehicleId || null,
    driverId: doc.driverId || null,
    type: doc.type,
    fileEnc,
    fileName: doc.fileName || '',
    fileType: doc.fileType || '',
    fileSize: doc.fileSize || (doc.fileBlob ? doc.fileBlob.size : 0),
    backEnc,
    backFileName: doc.backFileName || '',
    backFileType: doc.backFileType || '',
    backFileSize: doc.backFileSize || (doc.backBlob ? doc.backBlob.size : 0),
    issueDate: doc.issueDate || null,
    expiryDate: doc.expiryDate || null,
    number: doc.number || '',
    notes: doc.notes || '',
    createdAt: doc.createdAt,
  };
}

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
  const [pinConfig, setPinConfig] = useState(null);
  const [authed, setAuthed] = useState(false);
  const [securityLock, setSecurityLockState] = useState(null);
  const [dismissedTips, setDismissedTips] = useState({});

  const dekRef = useRef(null); // clave de cifrado de datos (en memoria tras desbloquear)
  const lockPausedRef = useRef(false); // suspende el re-bloqueo (p. ej. selector de archivos)

  // Carga de datos: vehículos/conductores siempre; documentos se descifran con la DEK.
  const refresh = useCallback(async () => {
    const [v, dr, recs] = await Promise.all([
      getAllVehicles(),
      getAllDrivers(),
      getAllDocuments(),
    ]);
    const dek = dekRef.current;
    const docs = dek ? await Promise.all(recs.map((r) => decryptDoc(r, dek))) : [];
    setVehicles(v);
    setDrivers(dr);
    setDocuments(docs);
    return { vehicles: v, drivers: dr, documents: docs };
  }, []);

  // Migra documentos guardados en claro (esquema previo) a cifrado en reposo.
  const migratePlaintextDocs = useCallback(async (dek) => {
    const recs = await getAllDocuments();
    for (const rec of recs) {
      if (rec.enc || (!rec.fileBlob && !rec.backBlob)) continue;
      const withBlobs = {
        ...rec,
        fileBlob: rec.fileBlob || null,
        backBlob: rec.backBlob || null,
      };
      await dbSaveDocument(await encryptDoc(withBlobs, dek));
    }
  }, []);

  // Carga inicial (sin descifrar documentos: aún no hay DEK).
  useEffect(() => {
    (async () => {
      const [v, dr, name, wd, sl, pin, tips] = await Promise.all([
        getAllVehicles(),
        getAllDrivers(),
        getSetting('driverName', ''),
        getSetting('warnDays', DEFAULT_WARN_DAYS),
        getSetting('securityLock', null),
        getSetting('pinConfig', null),
        getSetting('dismissedTips', {}),
      ]);
      setVehicles(v);
      setDrivers(dr);
      setDriverName(name || '');
      setWarnDaysState(Number(wd) || DEFAULT_WARN_DAYS);
      setSecurityLockState(sl);
      setPinConfig(pin);
      setDismissedTips(tips || {});
      setAuthed(false); // siempre arranca bloqueado
      setActiveVehicleId((prev) => prev || (v[0] ? v[0].id : null));
      setActiveDriverId((prev) => prev || (dr[0] ? dr[0].id : null));
      setLoading(false);
    })();
  }, []);

  // Re-bloquear al volver a segundo plano (salvo mientras se elige un archivo).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && !lockPausedRef.current) setAuthed(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Recordatorios locales una vez cargados y descifrados los documentos.
  useEffect(() => {
    if (loading || !authed) return;
    const pending = computePendingReminders(documents, vehicles, warnDays);
    fireReminderNotifications(pending);
  }, [loading, authed, documents, vehicles, warnDays]);

  // Suspende el auto-bloqueo mientras el sistema abre un diálogo (archivos/cámara).
  const pauseAutoLock = useCallback(() => {
    lockPausedRef.current = true;
    const resume = () => {
      window.removeEventListener('focus', resume);
      setTimeout(() => {
        lockPausedRef.current = false;
      }, 800);
    };
    window.addEventListener('focus', resume);
  }, []);

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
    if (!dekRef.current) throw new Error('La app está bloqueada.');
    const rec = await dbSaveDocument(await encryptDoc(doc, dekRef.current));
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
    const { config, dek } = await createPinConfig(pin);
    await setSetting('pinConfig', config);
    setPinConfig(config);
    dekRef.current = dek;
    // Cifra en reposo cualquier documento que existiera en claro.
    await migratePlaintextDocs(dek);
    setAuthed(true);
    await refresh();
    return config;
  }, [refresh, migratePlaintextDocs]);

  const verifyPin = useCallback(async (pin) => {
    if (isEncryptedPinConfig(pinConfig)) {
      const dek = await unlockWithPin(pin, pinConfig);
      if (!dek) return false;
      dekRef.current = dek;
      setAuthed(true);
      await refresh();
      return true;
    }
    // Migración del esquema anterior (PIN con hash, documentos en claro).
    if (pinConfig?.hash && pinConfig?.salt) {
      const hash = await sha256Hex(`${pinConfig.salt}:${pin}`);
      if (hash !== pinConfig.hash) return false;
      const dek = await generateDEK();
      dekRef.current = dek;
      const config = await rewrapPinConfig(pin, dek);
      await setSetting('pinConfig', config);
      setPinConfig(config);
      await migratePlaintextDocs(dek);
      setAuthed(true);
      await refresh();
      return true;
    }
    return false;
  }, [pinConfig, refresh, migratePlaintextDocs]);

  const changePin = useCallback(async (currentPin, newPin) => {
    let dek = null;
    if (isEncryptedPinConfig(pinConfig)) {
      dek = await unlockWithPin(currentPin, pinConfig);
    } else if (pinConfig?.hash && pinConfig?.salt) {
      const hash = await sha256Hex(`${pinConfig.salt}:${currentPin}`);
      if (hash === pinConfig.hash) dek = dekRef.current || (await generateDEK());
    }
    if (!dek) return false;
    const config = await rewrapPinConfig(newPin, dek);
    await setSetting('pinConfig', config);
    setPinConfig(config);
    dekRef.current = dek;
    return true;
  }, [pinConfig]);

  const unlock = useCallback(() => setAuthed(true), []);
  const lock = useCallback(() => setAuthed(false), []);

  // --- Biometría opcional (WebAuthn) ---
  const enableSecurityLock = useCallback(async () => {
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

  // --- Respaldo cifrado ---
  const exportBackup = useCallback(async (passphrase) => {
    const data = await serializeBackup({
      vehicles,
      drivers,
      documents,
      settings: { driverName },
    });
    const envelope = await encryptBackup(data, passphrase);
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(envelope)], { type: 'application/json' });
    downloadBlob(blob, `miguantera-backup-${stamp}.json`);
    return { vehicles: vehicles.length, drivers: drivers.length, documents: documents.length };
  }, [vehicles, drivers, documents, driverName]);

  const importBackup = useCallback(async (file, passphrase, { replace = false } = {}) => {
    if (!dekRef.current) throw new Error('La app está bloqueada.');
    let data = await parseBackupFile(file);
    if (isEncryptedBackup(data)) {
      try {
        data = await decryptBackup(data, passphrase);
      } catch {
        throw new Error('Frase de acceso incorrecta o archivo dañado.');
      }
    }
    if (!validateBackup(data)) {
      throw new Error('El archivo no es un respaldo válido de MiGuantera.');
    }

    if (replace) await clearAllData();

    for (const vehicle of data.vehicles) await dbSaveVehicle(vehicle);

    const importedDrivers = Array.isArray(data.drivers) ? data.drivers : [];
    for (const driver of importedDrivers) await dbSaveDriver(driver);

    // Compatibilidad: respaldos sin lista de conductores pero con docs personales.
    let legacyDriverId = null;
    if (!importedDrivers.length) {
      const hasDriverDocs = data.documents.some((d) => DRIVER_DOC_KEYS.has(d.type));
      const legacyName = data.settings?.driverName || '';
      if (hasDriverDocs || legacyName.trim()) {
        const rec = await dbSaveDriver({ name: legacyName.trim() || 'Conductor' });
        legacyDriverId = rec.id;
      }
    }

    for (const doc of data.documents) {
      const { fileBase64, backFileBase64, ...rest } = doc;
      const isDriverDoc = DRIVER_DOC_KEYS.has(rest.type);
      const fileBlob = fileBase64
        ? base64ToBlob(fileBase64, rest.fileType || 'application/octet-stream')
        : null;
      const backBlob = backFileBase64
        ? base64ToBlob(backFileBase64, rest.backFileType || 'application/octet-stream')
        : null;
      const record = await encryptDoc(
        {
          ...rest,
          driverId: isDriverDoc ? rest.driverId || legacyDriverId : null,
          vehicleId: isDriverDoc ? null : rest.vehicleId || null,
          fileBlob,
          backBlob,
        },
        dekRef.current
      );
      await dbSaveDocument(record);
    }

    await refresh();
    return {
      vehicles: data.vehicles.length,
      drivers: importedDrivers.length || (legacyDriverId ? 1 : 0),
      documents: data.documents.length,
    };
  }, [refresh]);

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
    pauseAutoLock,
    // Biometría opcional
    securityLock,
    enableSecurityLock,
    disableSecurityLock,
    // Sugerencias
    dismissedTips,
    dismissTip,
    // Respaldo
    exportBackup,
    importBackup,
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
