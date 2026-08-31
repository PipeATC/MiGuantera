import { openDB } from 'idb';

/**
 * MiGuantera - Capa de persistencia local (IndexedDB via idb).
 *
 * Todo el almacenamiento es 100% local en el navegador del usuario.
 * No existe backend ni API externa: los archivos (imágenes/PDF) se guardan
 * como Blob dentro de IndexedDB, evitando el límite de ~5MB de localStorage.
 */

const DB_NAME = 'miguantera-db';
const DB_VERSION = 1;

export const STORE_VEHICLES = 'vehicles';
export const STORE_DOCUMENTS = 'documents';
export const STORE_SETTINGS = 'settings';

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
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

export async function getDocument(id) {
  const db = await getDB();
  return db.get(STORE_DOCUMENTS, id);
}

export async function saveDocument(doc) {
  const db = await getDB();
  const now = Date.now();
  const record = {
    id: doc.id || makeId('doc'),
    vehicleId: doc.vehicleId || null,
    type: doc.type, // 'cedula' | 'licencia' | 'padron' | 'permiso' | 'revision' | 'soap'
    // Anverso (cara frontal). Se mantienen los nombres históricos file* por
    // compatibilidad con respaldos y registros existentes.
    fileName: doc.fileName || '',
    fileBlob: doc.fileBlob || null, // Blob
    fileType: doc.fileType || '', // MIME
    fileSize: doc.fileSize || (doc.fileBlob ? doc.fileBlob.size : 0),
    // Reverso (cara posterior). Opcional.
    backFileName: doc.backFileName || '',
    backBlob: doc.backBlob || null, // Blob
    backFileType: doc.backFileType || '', // MIME
    backFileSize: doc.backFileSize || (doc.backBlob ? doc.backBlob.size : 0),
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
    [STORE_VEHICLES, STORE_DOCUMENTS, STORE_SETTINGS],
    'readwrite'
  );
  await tx.objectStore(STORE_VEHICLES).clear();
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
