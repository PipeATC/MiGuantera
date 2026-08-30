/**
 * Construye la URL de un asset público respetando la `base` de Vite.
 * Necesario para que las rutas funcionen bajo un subpath (p. ej. GitHub
 * Pages en /MiGuantera/). No uses rutas absolutas "/icons/..." en runtime.
 */
export function asset(path) {
  const base = import.meta.env.BASE_URL || '/';
  return base + String(path).replace(/^\//, '');
}
