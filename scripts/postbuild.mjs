/**
 * Post-build para hosting estático tipo GitHub Pages.
 *
 * GitHub Pages no tiene fallback SPA: al recargar una ruta como
 * /MiGuantera/gestion devuelve 404. Copiando index.html a 404.html,
 * Pages sirve la app y React Router resuelve la ruta en el cliente.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const index = resolve(root, 'dist/index.html');
const fallback = resolve(root, 'dist/404.html');

if (existsSync(index)) {
  copyFileSync(index, fallback);
  console.log('postbuild: dist/404.html generado (fallback SPA).');
} else {
  console.warn('postbuild: no se encontró dist/index.html, se omite el fallback.');
}
