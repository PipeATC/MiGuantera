/**
 * Respaldo cifrado de MiGuantera.
 *
 * El respaldo se exporta como un sobre JSON CIFRADO con una frase de acceso
 * (passphrase) elegida por el usuario: se deriva una clave con PBKDF2 y se cifra
 * todo el contenido (incluidas las imágenes en Base64) con AES-GCM. Así el
 * archivo protege los datos aunque se filtre. Para restaurarlo se pide la misma
 * frase.
 */

import { blobToBase64, base64ToBlob } from './fileUtils.js';
import {
  deriveKEK,
  encryptString,
  decryptString,
  randomSaltB64,
} from './crypto.js';

export const BACKUP_VERSION = 4;
export const BACKUP_MAGIC = 'miguantera-backup';

/**
 * Serializa los datos (ya descifrados en memoria) a un objeto de respaldo,
 * con los archivos convertidos a Base64.
 */
export async function serializeBackup({ vehicles, drivers, documents, settings }) {
  const docs = await Promise.all(
    documents.map(async (doc) => {
      // Excluir Blobs y campos cifrados; guardar solo Base64 + metadatos.
      const { fileBlob, backBlob, fileEnc, backEnc, ...rest } = doc; // eslint-disable-line no-unused-vars
      return {
        ...rest,
        fileBase64: fileBlob ? await blobToBase64(fileBlob) : null,
        backFileBase64: backBlob ? await blobToBase64(backBlob) : null,
      };
    })
  );

  return {
    magic: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    app: 'MiGuantera',
    exportedAt: new Date().toISOString(),
    settings: settings || {},
    vehicles: vehicles || [],
    drivers: drivers || [],
    documents: docs,
  };
}

/** Cifra un objeto de respaldo con una frase de acceso. Devuelve el sobre. */
export async function encryptBackup(obj, passphrase) {
  const kdfSalt = randomSaltB64();
  const kek = await deriveKEK(passphrase, kdfSalt);
  const { iv, data } = await encryptString(JSON.stringify(obj), kek);
  return {
    magic: BACKUP_MAGIC,
    enc: true,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    kdfSalt,
    iv,
    data,
  };
}

/** Descifra un sobre de respaldo con la frase de acceso. Lanza si es incorrecta. */
export async function decryptBackup(envelope, passphrase) {
  const kek = await deriveKEK(passphrase, envelope.kdfSalt);
  const json = await decryptString({ iv: envelope.iv, data: envelope.data }, kek);
  return JSON.parse(json);
}

export function isEncryptedBackup(x) {
  return !!(x && x.enc && x.kdfSalt && x.iv && x.data);
}

/** Valida la estructura mínima de un respaldo ya descifrado. */
export function validateBackup(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.magic !== BACKUP_MAGIC) return false;
  if (!Array.isArray(data.vehicles) || !Array.isArray(data.documents)) return false;
  return true;
}

/** Lee un archivo de respaldo y lo parsea a objeto (puede venir cifrado). */
export function parseBackupFile(file) {
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

export { base64ToBlob };
