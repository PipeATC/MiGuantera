/**
 * Bloqueo de seguridad con el método nativo del dispositivo.
 *
 * Usa la Web Authentication API (WebAuthn) con un autenticador de plataforma
 * y `userVerification: 'required'`. Esto invoca el mecanismo de bloqueo propio
 * del dispositivo:
 *   - Teléfonos: huella / rostro (biometría) o el bloqueo del sistema.
 *   - Windows: Windows Hello (PIN, huella o rostro).
 *   - macOS: Touch ID.
 *
 * Como MiGuantera es 100% local (sin servidor), la credencial se registra y se
 * verifica en el propio dispositivo: no hay verificación de firma en backend.
 * Es una compuerta local para abrir la app, no autenticación contra un servidor.
 * La credencial (passkey de plataforma) queda ligada a este dispositivo/navegador.
 */

/* --------------------------- Helpers base64url --------------------------- */

function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 ? '='.repeat(4 - (base64.length % 4)) : '';
  const str = atob(base64 + pad);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes.buffer;
}

function randomBytes(len = 32) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return arr;
}

/* ------------------------------ Disponibilidad --------------------------- */

/**
 * ¿El dispositivo puede verificar al usuario con un autenticador de plataforma?
 * Requiere contexto seguro (https o localhost) y WebAuthn con biometría/PIN.
 */
export async function isDeviceAuthSupported() {
  try {
    if (typeof window === 'undefined') return false;
    if (!window.isSecureContext) return false;
    if (!window.PublicKeyCredential) return false;
    if (!navigator.credentials || !navigator.credentials.create) return false;
    if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/* ------------------------------- Registro -------------------------------- */

/**
 * Registra una credencial de plataforma. Dispara el método del dispositivo
 * (biometría / PIN) para confirmar. Devuelve { credentialId } o lanza error.
 */
export async function registerDeviceCredential({ userName = 'MiGuantera', prfSalt } = {}) {
  const publicKey = {
    challenge: randomBytes(32),
    rp: { name: 'MiGuantera' }, // id omitido: usa el dominio efectivo actual
    user: {
      id: randomBytes(16),
      name: userName,
      displayName: userName,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 }, // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  };
  // Extensión PRF: permite derivar un secreto estable del autenticador para
  // envolver la clave de cifrado y desbloquear los datos con biometría.
  if (prfSalt) {
    publicKey.extensions = { prf: { eval: { first: prfSalt } } };
  }

  const cred = await navigator.credentials.create({ publicKey });
  if (!cred) throw new Error('No se pudo registrar el bloqueo.');
  const ext = cred.getClientExtensionResults ? cred.getClientExtensionResults() : {};
  const prfEnabled = !!ext?.prf?.enabled;
  const first = ext?.prf?.results?.first;
  return {
    credentialId: bufferToBase64url(cred.rawId),
    prfEnabled,
    prfSecret: first ? new Uint8Array(first) : null,
  };
}

/**
 * Obtiene el secreto PRF del autenticador para la sal dada (verifica al usuario
 * con biometría). Devuelve Uint8Array o null si el dispositivo no soporta PRF.
 */
export async function getPrfSecret(credentialId, prfSalt) {
  const publicKey = {
    challenge: randomBytes(32),
    userVerification: 'required',
    timeout: 60000,
    extensions: { prf: { eval: { first: prfSalt } } },
  };
  if (credentialId) {
    publicKey.allowCredentials = [
      { type: 'public-key', id: base64urlToBuffer(credentialId), transports: ['internal'] },
    ];
  }
  const assertion = await navigator.credentials.get({ publicKey });
  if (!assertion) return null;
  const ext = assertion.getClientExtensionResults ? assertion.getClientExtensionResults() : {};
  const first = ext?.prf?.results?.first;
  return first ? new Uint8Array(first) : null;
}

/* ------------------------------ Verificación ----------------------------- */

/**
 * Solicita al dispositivo verificar al usuario (biometría / PIN) usando la
 * credencial registrada. Devuelve true si la verificación fue exitosa.
 */
export async function verifyDeviceCredential(credentialId) {
  const publicKey = {
    challenge: randomBytes(32),
    userVerification: 'required',
    timeout: 60000,
  };
  if (credentialId) {
    publicKey.allowCredentials = [
      {
        type: 'public-key',
        id: base64urlToBuffer(credentialId),
        transports: ['internal'],
      },
    ];
  }

  const assertion = await navigator.credentials.get({ publicKey });
  return !!assertion;
}
