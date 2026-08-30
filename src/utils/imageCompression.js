/**
 * Compresión básica de imágenes en cliente usando <canvas>.
 * Reduce dimensiones y recodifica a JPEG/WebP antes de guardar en IndexedDB,
 * ahorrando espacio. Los PDF se guardan tal cual (no se comprimen aquí).
 */

const DEFAULTS = {
  maxDimension: 2000, // px lado mayor
  quality: 0.82,
  mimeType: 'image/jpeg',
};

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Comprime una imagen (File/Blob) y devuelve un Blob optimizado.
 * Si el archivo no es imagen, se devuelve tal cual.
 */
export async function compressImage(file, options = {}) {
  const opts = { ...DEFAULTS, ...options };

  if (!file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }
  // GIF u otros formatos animados: no re-encodificar para no romper animación.
  if (file.type === 'image/gif') return file;

  let img;
  try {
    img = await loadImage(file);
  } catch {
    return file; // fallback: guardar original
  }

  let { width, height } = img;
  const scale = Math.min(1, opts.maxDimension / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  // Fondo blanco para PNG con transparencia -> JPEG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, opts.mimeType, opts.quality)
  );

  if (!blob) return file;

  // Si la "compresión" resultó mayor que el original, conservar el original.
  return blob.size < file.size ? blob : file;
}
