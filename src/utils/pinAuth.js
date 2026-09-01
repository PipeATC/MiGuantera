/**
 * PIN local de 4 dígitos — autenticación inicial de MiGuantera.
 *
 * El PIN no se guarda en texto plano: se almacena un hash SHA-256 con sal
 * aleatoria. Al ser 100% local (sin servidor), esto es una compuerta de acceso
 * en el dispositivo, no autenticación remota. La biometría (WebAuthn) es una
 * mejora opcional que se ofrece por separado.
 */

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Sal aleatoria en hexadecimal. */
export function makeSalt(len = 16) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return toHex(arr.buffer);
}

/** Hash SHA-256 de `sal:pin`. */
export async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

/** Construye el registro persistible del PIN. */
export async function createPinConfig(pin) {
  const salt = makeSalt();
  const hash = await hashPin(pin, salt);
  return { salt, hash, createdAt: Date.now() };
}

/** Verifica un PIN contra el registro almacenado. */
export async function verifyPinConfig(pin, config) {
  if (!config || !config.salt || !config.hash) return false;
  const hash = await hashPin(pin, config.salt);
  return hash === config.hash;
}

/** ¿El PIN tiene el formato válido (exactamente 4 dígitos)? */
export function isValidPin(pin) {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}
