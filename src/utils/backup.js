/**
 * Exportar / Importar respaldo completo.
 *
 * Formato JSON portable con los archivos codificados en Base64.
 * No requiere backend: el usuario descarga y guarda el respaldo donde quiera.
 */

import {
  getAllVehicles,
  getAllDocuments,
  saveVehicle,
  saveDocument,
  clearAllData,
  getSetting,
  setSetting,
} from '../db/database.js';
import { blobToBase64, base64ToBlob, downloadBlob } from './fileUtils.js';

export const BACKUP_VERSION = 2;
export const BACKUP_MAGIC = 'miguantera-backup';

/** Construye el objeto de respaldo (con archivos en Base64). */
export async function buildBackup() {
  const [vehicles, documents] = await Promise.all([
    getAllVehicles(),
    getAllDocuments(),
  ]);

  const driverName = await getSetting('driverName', '');

  const docsSerialized = await Promise.all(
    documents.map(async (doc) => {
      const { fileBlob, backBlob, ...rest } = doc;
      const fileBase64 = fileBlob ? await blobToBase64(fileBlob) : null;
      const backFileBase64 = backBlob ? await blobToBase64(backBlob) : null;
      return { ...rest, fileBase64, backFileBase64 };
    })
  );

  return {
    magic: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'MiGuantera',
    settings: { driverName },
    vehicles,
    documents: docsSerialized,
  };
}

/** Genera y descarga el respaldo como archivo .json. */
export async function exportBackup() {
  const backup = await buildBackup();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `miguantera-backup-${stamp}.json`);
  return {
    vehicles: backup.vehicles.length,
    documents: backup.documents.length,
    size: blob.size,
  };
}

/** Valida la estructura mínima de un respaldo. */
export function validateBackup(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.magic !== BACKUP_MAGIC) return false;
  if (!Array.isArray(data.vehicles) || !Array.isArray(data.documents)) return false;
  return true;
}

/**
 * Importa un respaldo.
 * @param {object} data respaldo parseado
 * @param {{replace?: boolean}} opts replace=true borra todo antes de importar
 */
export async function importBackup(data, opts = {}) {
  if (!validateBackup(data)) {
    throw new Error('El archivo no es un respaldo válido de MiGuantera.');
  }

  if (opts.replace) {
    await clearAllData();
  }

  for (const vehicle of data.vehicles) {
    await saveVehicle(vehicle);
  }

  for (const doc of data.documents) {
    const { fileBase64, backFileBase64, ...rest } = doc;
    const fileBlob = fileBase64
      ? base64ToBlob(fileBase64, rest.fileType || 'application/octet-stream')
      : null;
    const backBlob = backFileBase64
      ? base64ToBlob(backFileBase64, rest.backFileType || 'application/octet-stream')
      : null;
    await saveDocument({ ...rest, fileBlob, backBlob });
  }

  if (data.settings && typeof data.settings.driverName === 'string') {
    await setSetting('driverName', data.settings.driverName);
  }

  return {
    vehicles: data.vehicles.length,
    documents: data.documents.length,
  };
}

/** Lee un File de respaldo y lo parsea a objeto. */
export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch {
        reject(new Error('No se pudo leer el archivo: JSON inválido.'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsText(file);
  });
}
