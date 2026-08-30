/**
 * Conversión de archivos: Blob <-> Base64 / DataURL, y helpers de descarga.
 */

/** Convierte un Blob a DataURL (base64). */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** DataURL -> Blob. */
export async function dataURLToBlob(dataURL) {
  const res = await fetch(dataURL);
  return res.blob();
}

/** Convierte Blob a base64 puro (sin el prefijo data:). */
export async function blobToBase64(blob) {
  const dataURL = await blobToDataURL(blob);
  const idx = dataURL.indexOf(',');
  return idx >= 0 ? dataURL.slice(idx + 1) : dataURL;
}

/** base64 + mime -> Blob. */
export function base64ToBlob(base64, mime = 'application/octet-stream') {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}

/** Formatea bytes en unidad legible. */
export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Dispara la descarga de un Blob en el navegador. */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'archivo';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function isImage(mime) {
  return typeof mime === 'string' && mime.startsWith('image/');
}
export function isPDF(mime) {
  return mime === 'application/pdf';
}
