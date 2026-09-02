/**
 * Almacenamiento persistente. En una billetera de documentos es crítico que el
 * navegador NO desaloje la base de datos (IndexedDB) cuando el dispositivo tiene
 * poca memoria. `navigator.storage.persist()` solicita almacenamiento durable;
 * los navegadores lo conceden automáticamente cuando la app está instalada o
 * tiene suficiente interacción del usuario.
 */

const supported =
  typeof navigator !== 'undefined' &&
  navigator.storage &&
  typeof navigator.storage.persist === 'function';

/**
 * Solicita (una vez) almacenamiento persistente.
 * @returns {Promise<boolean>} true si el almacenamiento es durable.
 */
export async function requestPersistentStorage() {
  if (!supported) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** ¿El almacenamiento ya es persistente? (sin solicitarlo). */
export async function isStoragePersisted() {
  if (!supported) return false;
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

/**
 * Estimación de uso/cuota de almacenamiento, para mostrarla en Ajustes.
 * @returns {Promise<{usage:number, quota:number}|null>}
 */
export async function getStorageEstimate() {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.estimate !== 'function'
  ) {
    return null;
  }
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}

export const storagePersistenceSupported = supported;
