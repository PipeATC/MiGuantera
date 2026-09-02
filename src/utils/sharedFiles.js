/**
 * Lado cliente del Share Target. El service worker (src/sw.js) deja los
 * archivos compartidos por el sistema en una caché temporal; aquí se recogen,
 * se convierten en Blobs utilizables y se limpia la caché.
 */

// Debe coincidir con SHARE_CACHE en src/sw.js.
const SHARE_CACHE = 'mg-shared-files';

const cacheAvailable = typeof caches !== 'undefined';

/**
 * Recoge los archivos compartidos pendientes y vacía la caché.
 * @returns {Promise<Array<{blob: Blob, fileName: string, fileType: string}>>}
 */
export async function takeSharedFiles() {
  if (!cacheAvailable) return [];
  let cache;
  try {
    cache = await caches.open(SHARE_CACHE);
  } catch {
    return [];
  }

  const requests = await cache.keys();
  const files = [];
  for (const req of requests) {
    try {
      const res = await cache.match(req);
      if (!res) continue;
      const blob = await res.blob();
      const nameHeader = res.headers.get('x-filename');
      const fileName = nameHeader ? decodeURIComponent(nameHeader) : 'documento';
      const fileType = res.headers.get('content-type') || blob.type || '';
      files.push({ blob, fileName, fileType });
    } catch {
      /* ignora una entrada dañada y continúa */
    }
    await cache.delete(req);
  }
  return files;
}
