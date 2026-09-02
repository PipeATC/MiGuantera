/**
 * Service worker propio (estrategia injectManifest).
 *
 * Replica el comportamiento previo de generateSW (precache de la app,
 * fallback SPA a index.html, actualización automática) y añade el manejo del
 * Share Target: cuando el usuario "comparte" una foto o PDF hacia MiGuantera,
 * el sistema hace un POST a ./compartir; aquí se guarda el archivo en una caché
 * temporal y se redirige a la app, que lo recoge y abre el importador.
 */
import { clientsClaim } from 'workbox-core';
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

// Activación inmediata de nuevas versiones (equivalente a skipWaiting +
// clientsClaim de la configuración anterior).
self.skipWaiting();
clientsClaim();

// Precache de todos los assets generados por el build.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const base = import.meta.env.BASE_URL; // '/' en dev, '/MiGuantera/' en build

// Fallback SPA: cualquier navegación se resuelve con index.html, excepto el
// endpoint del Share Target (que se maneja abajo con un POST).
registerRoute(
  new NavigationRoute(createHandlerBoundToURL(`${base}index.html`), {
    denylist: [/\/compartir(?:\?.*)?$/],
  })
);

// Caché temporal donde se dejan los archivos compartidos hasta que la app los
// recoge. El nombre se comparte con el lado cliente (utils/sharedFiles.js).
const SHARE_CACHE = 'mg-shared-files';

async function handleShare(request) {
  try {
    const formData = await request.formData();
    const files = formData
      .getAll('documento')
      .filter((f) => f && typeof f !== 'string');

    const cache = await caches.open(SHARE_CACHE);
    // Limpia cualquier envío anterior no recogido.
    for (const key of await cache.keys()) await cache.delete(key);

    let i = 0;
    for (const file of files) {
      const headers = new Headers({
        'content-type': file.type || 'application/octet-stream',
        'x-filename': encodeURIComponent(file.name || `documento-${i + 1}`),
      });
      // Clave estable y absoluta dentro del scope del SW.
      const key = `${self.registration.scope}__shared__/${Date.now()}-${i}`;
      await cache.put(key, new Response(file, { headers }));
      i += 1;
    }
  } catch {
    /* si algo falla, se redirige igual y la app no mostrará nada */
  }
  // Vuelve a la app; el cliente leerá la caché y abrirá el importador.
  return Response.redirect(self.registration.scope, 303);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method === 'POST' && /\/compartir\/?$/.test(url.pathname)) {
    event.respondWith(handleShare(request));
  }
});
