/**
 * Cifrado local de MiGuantera (WebCrypto / AES-GCM).
 *
 * Esquema de claves:
 *  - DEK (Data Encryption Key): clave AES-GCM aleatoria que cifra los archivos
 *    de los documentos. Nunca se guarda en claro.
 *  - KEK (Key Encryption Key): se deriva del PIN con PBKDF2. Envuelve (cifra) la
 *    DEK. Cambiar el PIN solo vuelve a envolver la DEK: no re-cifra los archivos.
 *
 * Al abrir la app y verificar el PIN, la DEK se desenvuelve y queda en memoria
 * para cifrar/descifrar. Requiere contexto seguro (https o localhost).
 */

const PBKDF2_ITERATIONS = 210000;

/* ----------------------------- base64 helpers ---------------------------- */

export function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let str = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    str += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(str);
}

export function b64ToBuf(b64) {
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

function randomBytes(len) {
  return crypto.getRandomValues(new Uint8Array(len));
}

/** Hash SHA-256 en hexadecimal (compatibilidad con el PIN del esquema previo). */
export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomSaltB64(len = 16) {
  return bufToB64(randomBytes(len));
}

/* ------------------------------ derivación ------------------------------- */

/** Deriva una KEK AES-GCM desde el PIN y una sal (base64). */
export async function deriveKEK(pin, saltB64, iterations = PBKDF2_ITERATIONS) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64ToBuf(saltB64), iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/* --------------------------------- DEK ----------------------------------- */

/** Genera una DEK AES-GCM (extraíble para poder envolverla). */
export function generateDEK() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/** Envuelve (cifra) la DEK con la KEK. Devuelve { iv, data } en base64. */
export async function wrapDEK(dek, kek) {
  const raw = await crypto.subtle.exportKey('raw', dek);
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, raw);
  return { iv: bufToB64(iv), data: bufToB64(data) };
}

/**
 * Desenvuelve la DEK con la KEK. Lanza si el PIN (y por tanto la KEK) es
 * incorrecto (falla la etiqueta de autenticación de AES-GCM).
 */
export async function unwrapDEK(wrapped, kek) {
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBuf(wrapped.iv) },
    kek,
    b64ToBuf(wrapped.data)
  );
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/* ------------------------------- archivos -------------------------------- */

/** Cifra un Blob con la clave dada. Devuelve { iv(b64), data(ArrayBuffer) }. */
export async function encryptBlob(blob, key) {
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    await blob.arrayBuffer()
  );
  return { iv: bufToB64(iv), data };
}

/** Descifra { iv, data } a un Blob del tipo indicado. */
export async function decryptToBlob(enc, key, type = 'application/octet-stream') {
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBuf(enc.iv) },
    key,
    enc.data
  );
  return new Blob([buf], { type });
}

/* -------------------------- texto (respaldo) ----------------------------- */

/** Cifra una cadena con una clave; devuelve { iv, data } en base64. */
export async function encryptString(text, key) {
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text)
  );
  return { iv: bufToB64(iv), data: bufToB64(data) };
}

/** Descifra { iv(b64), data(b64) } a texto. Lanza si la clave es incorrecta. */
export async function decryptString(enc, key) {
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBuf(enc.iv) },
    key,
    b64ToBuf(enc.data)
  );
  return new TextDecoder().decode(buf);
}
