import { openDB } from 'idb';

/**
 * MiGuantera - Capa de persistencia local (IndexedDB via idb).
 *
 * Todo el almacenamiento es 100% local en el navegador del usuario.
 * No existe backend ni API externa: los archivos (imágenes/PDF) se guardan
 * como Blob dentro de IndexedDB, evitando el límite de ~5MB de localStorage.
 */

const DB_NAME = 'miguantera-db';
const DB_VERSION = 2;

export const STORE_VEHICLES = 'vehicles';
export const STORE_DRIVERS = 'drivers';
export const STORE_DOCUMENTS = 'documents';
export const STORE_SETTINGS = 'settings';

/** Tipos de documento que pertenecen a un conductor (no a un vehículo). */
const DRIVER_DOC_KEYS = new Set(['cedula', 'licencia']);

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        // --- v1: estructura base ---
        if (!db.objectStoreNames.contains(STORE_VEHICLES)) {
          const vehicles = db.createObjectStore(STORE_VEHICLES, { keyPath: 'id' });
          vehicles.createIndex('by-name', 'name');
        }
        if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
          const docs = db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'id' });
          docs.createIndex('by-vehicle', 'vehicleId');
          docs.createIndex('by-type', 'type');
          docs.createIndex('by-expiry', 'expiryDate');
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }

        // --- v2: conductores (múltiples titulares) ---
        if (!db.objectStoreNames.contains(STORE_DRIVERS)) {
          const drivers = db.createObjectStore(STORE_DRIVERS, { keyPath: 'id' });
          drivers.createIndex('by-name', 'name');
        }
        const docStore = tx.objectStore(STORE_DOCUMENTS);
        if (!docStore.indexNames.contains('by-driver')) {
          docStore.createIndex('by-driver', 'driverId');
        }

        // Migración de instalaciones v1: los documentos personales (cédula /
        // licencia) pasan a pertenecer a un conductor. Se crea un conductor a
        // partir del nombre del titular guardado en ajustes.
        if (oldVersion >= 1 && oldVersion < 2) {
          const settingsStore = tx.objectStore(STORE_SETTINGS);
          const driverNameRow = await settingsStore.get('driverName');
          const legacyName = (driverNameRow && driverNameRow.value) || '';
          const allDocs = await docStore.getAll();
          const driverDocs = allDocs.filter((d) => DRIVER_DOC_KEYS.has(d.type));

          if (legacyName.trim() || driverDocs.length) {
            const now = Date.now();
            const driverId = makeId('drv');
            await tx.objectStore(STORE_DRIVERS).put({
              id: driverId,
              name: legacyName.trim() || 'Conductor',
              run: '',
              phone: '',
              notes: '',
              createdAt: now,
              updatedAt: now,
            });
            for (const doc of driverDocs) {
              doc.driverId = driverId;
              doc.vehicleId = null;
              await docStore.put(doc);
            }
          }
        }
      },
    });
  }
  return dbPromise;
}

/* ------------------------------------------------------------------ */
/*  Utilidades de ID                                                    */
/* ------------------------------------------------------------------ */

export function makeId(prefix = 'id') {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${rand}`;
}

/* ------------------------------------------------------------------ */
/*  Vehículos                                                           */
/* ------------------------------------------------------------------ */

export async function getAllVehicles() {
  const db = await getDB();
  const list = await db.getAll(STORE_VEHICLES);
  return list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export async function getVehicle(id) {
  const db = await getDB();
  return db.get(STORE_VEHICLES, id);
}

export async function saveVehicle(vehicle) {
  const db = await getDB();
  const now = Date.now();
  const record = {
    id: vehicle.id || makeId('veh'),
    name: (vehicle.name || '').trim(),
    plate: (vehicle.plate || '').trim().toUpperCase(),
    brand: (vehicle.brand || '').trim(),
    model: (vehicle.model || '').trim(),
    year: vehicle.year ? Number(vehicle.year) : null,
    type: vehicle.type || 'car', // 'car' | 'moto'
    createdAt: vehicle.createdAt || now,
    updatedAt: now,
  };
  await db.put(STORE_VEHICLES, record);
  return record;
}

export async function deleteVehicle(id) {
  const db = await getDB();
  const tx = db.transaction([STORE_VEHICLES, STORE_DOCUMENTS], 'readwrite');
  // Eliminar en cascada los documentos asociados
  const docIndex = tx.objectStore(STORE_DOCUMENTS).index('by-vehicle');
  let cursor = await docIndex.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.objectStore(STORE_VEHICLES).delete(id);
  await tx.done;
}

/* ------------------------------------------------------------------ */
/*  Conductores                                                         */
/* ------------------------------------------------------------------ */

export async function getAllDrivers() {
  const db = await getDB();
  const list = await db.getAll(STORE_DRIVERS);
  return list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export async function getDriver(id) {
  const db = await getDB();
  return db.get(STORE_DRIVERS, id);
}

export async function saveDriver(driver) {
  const db = await getDB();
  const now = Date.now();
  const record = {
    id: driver.id || makeId('drv'),
    name: (driver.name || '').trim(),
    run: (driver.run || '').trim().toUpperCase(),
    phone: (driver.phone || '').trim(),
    notes: (driver.notes || '').trim(),
    createdAt: driver.createdAt || now,
    updatedAt: now,
  };
  await db.put(STORE_DRIVERS, record);
  return record;
}

export async function deleteDriver(id) {
  const db = await getDB();
  const tx = db.transaction([STORE_DRIVERS, STORE_DOCUMENTS], 'readwrite');
  // Eliminar en cascada los documentos personales del conductor
  const docIndex = tx.objectStore(STORE_DOCUMENTS).index('by-driver');
  let cursor = await docIndex.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.objectStore(STORE_DRIVERS).delete(id);
  await tx.done;
}

/* ------------------------------------------------------------------ */
/*  Documentos                                                          */
/* ------------------------------------------------------------------ */

export async function getAllDocuments() {
  const db = await getDB();
  return db.getAll(STORE_DOCUMENTS);
}

export async function getDocumentsByVehicle(vehicleId) {
  const db = await getDB();
  return db.getAllFromIndex(STORE_DOCUMENTS, 'by-vehicle', vehicleId);
}

export async function getDocumentsByDriver(driverId) {
  const db = await getDB();
  return db.getAllFromIndex(STORE_DOCUMENTS, 'by-driver', driverId);
}

export async function getDocument(id) {
  const db = await getDB();
  return db.get(STORE_DOCUMENTS, id);
}

/**
 * Guarda el registro de un documento. Los archivos (anverso/reverso) se
 * almacenan CIFRADOS: el contexto entrega `fileEnc` / `backEnc` = { iv, data }
 * (AES-GCM) en vez de Blobs en claro. Los metadatos (tipo, nombre, tamaño,
 * fechas) se guardan sin cifrar para poder listar y ordenar sin la clave.
 */
export async function saveDocument(doc) {
  const db = await getDB();
  const now = Date.now();
  const record = {
    id: doc.id || makeId('doc'),
    vehicleId: doc.vehicleId || null,
    driverId: doc.driverId || null, // documentos personales del conductor
    type: doc.type, // 'cedula' | 'licencia' | 'padron' | 'permiso' | 'revision' | 'soap'
    enc: true, // archivos cifrados en reposo
    // Anverso (cara frontal): { iv, data } cifrado, o null.
    fileEnc: doc.fileEnc || null,
    fileName: doc.fileName || '',
    fileType: doc.fileType || '',
    fileSize: doc.fileSize || 0,
    // Reverso (cara posterior): opcional.
    backEnc: doc.backEnc || null,
    backFileName: doc.backFileName || '',
    backFileType: doc.backFileType || '',
    backFileSize: doc.backFileSize || 0,
    issueDate: doc.issueDate || null, // ISO yyyy-mm-dd
    expiryDate: doc.expiryDate || null, // ISO yyyy-mm-dd
    number: doc.number || '', // nº de documento / patente asociada
    notes: doc.notes || '',
    createdAt: doc.createdAt || now,
    lastUpdated: now,
  };
  await db.put(STORE_DOCUMENTS, record);
  return record;
}

export async function deleteDocument(id) {
  const db = await getDB();
  await db.delete(STORE_DOCUMENTS, id);
}

/* ------------------------------------------------------------------ */
/*  Ajustes (key/value)                                                 */
/* ------------------------------------------------------------------ */

export async function getSetting(key, fallback = null) {
  const db = await getDB();
  const row = await db.get(STORE_SETTINGS, key);
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  const db = await getDB();
  await db.put(STORE_SETTINGS, { key, value });
  return value;
}

/* ------------------------------------------------------------------ */
/*  Mantenimiento                                                       */
/* ------------------------------------------------------------------ */

export async function clearAllData() {
  const db = await getDB();
  const tx = db.transaction(
    [STORE_VEHICLES, STORE_DRIVERS, STORE_DOCUMENTS, STORE_SETTINGS],
    'readwrite'
  );
  await tx.objectStore(STORE_VEHICLES).clear();
  await tx.objectStore(STORE_DRIVERS).clear();
  await tx.objectStore(STORE_DOCUMENTS).clear();
  await tx.objectStore(STORE_SETTINGS).clear();
  await tx.done;
}

/** Estimación de uso de almacenamiento (StorageManager API). */
export async function getStorageEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const { usage, quota } = await navigator.storage.estimate();
      return { usage: usage || 0, quota: quota || 0 };
    } catch {
      return { usage: 0, quota: 0 };
    }
  }
  return { usage: 0, quota: 0 };
}
