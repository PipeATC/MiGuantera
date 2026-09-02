/**
 * PIN local de 4 dígitos — autenticación inicial de MiGuantera.
 *
 * El PIN no se guarda: se usa para derivar una KEK (PBKDF2) que envuelve la DEK
 * (clave que cifra los archivos). Verificar el PIN = lograr desenvolver la DEK.
 * Así no existe un hash del PIN que atacar y la verificación queda ligada al
 * cifrado real de los datos.
 */

import {
  deriveKEK,
  generateDEK,
  wrapDEK,
  unwrapDEK,
  randomSaltB64,
} from './crypto.js';

const PIN_CONFIG_VERSION = 2;

/** ¿El PIN tiene el formato válido (exactamente 4 dígitos)? */
export function isValidPin(pin) {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}

/**
 * Crea la configuración del PIN: genera una DEK nueva y la envuelve con la KEK
 * derivada del PIN. Devuelve { config, dek } — `config` es persistible.
 */
export async function createPinConfig(pin) {
  const salt = randomSaltB64();
  const kek = await deriveKEK(pin, salt);
  const dek = await generateDEK();
  const wrappedDEK = await wrapDEK(dek, kek);
  const config = { v: PIN_CONFIG_VERSION, salt, wrappedDEK, createdAt: Date.now() };
  return { config, dek };
}

/**
 * Intenta desbloquear con el PIN. Devuelve la DEK si es correcto, o null si no.
 * Solo aplica a configuraciones nuevas (con DEK envuelta).
 */
export async function unlockWithPin(pin, config) {
  if (!config || !config.wrappedDEK || !config.salt) return null;
  try {
    const kek = await deriveKEK(pin, config.salt);
    return await unwrapDEK(config.wrappedDEK, kek);
  } catch {
    return null; // PIN incorrecto (falla la autenticación AES-GCM)
  }
}

/** Reenvuelve la DEK existente con un PIN nuevo (no re-cifra los archivos). */
export async function rewrapPinConfig(newPin, dek) {
  const salt = randomSaltB64();
  const kek = await deriveKEK(newPin, salt);
  const wrappedDEK = await wrapDEK(dek, kek);
  return { v: PIN_CONFIG_VERSION, salt, wrappedDEK, createdAt: Date.now() };
}

/** ¿La configuración usa el esquema nuevo (con DEK)? */
export function isEncryptedPinConfig(config) {
  return !!(config && config.wrappedDEK);
}
