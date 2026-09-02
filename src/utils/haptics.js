/**
 * Feedback háptico ligero (Vibration API). Da sensación de app nativa al
 * confirmar acciones, cambiar de elemento o señalar un error.
 *
 * La API no existe en escritorio ni en iOS Safari; en esos casos las funciones
 * simplemente no hacen nada (no-op), por lo que se pueden llamar sin
 * comprobaciones previas.
 */

const canVibrate =
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

function buzz(pattern) {
  if (!canVibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* algunos navegadores lanzan si la página no tuvo interacción del usuario */
  }
}

/** Toque muy sutil: pulsar una tecla, seleccionar una opción. */
export const tapLight = () => buzz(8);

/** Toque medio: abrir una hoja, alternar un control. */
export const tapMedium = () => buzz(15);

/** Cambio de elemento: deslizar entre caras de un documento, cambiar de pestaña. */
export const selection = () => buzz(10);

/** Éxito: se guardó un documento, se desbloqueó la app. */
export const success = () => buzz([12, 40, 24]);

/** Error / rechazo: PIN incorrecto, validación fallida. */
export const error = () => buzz([30, 60, 30, 60, 30]);

export const hapticsSupported = canVibrate;
