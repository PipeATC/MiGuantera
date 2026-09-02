import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
//
// `base` debe coincidir con la ruta donde se sirve la app.
// En GitHub Pages de un repo, la URL es https://<user>.github.io/<repo>/,
// por lo que se usa '/MiGuantera/' en el build. En desarrollo se usa '/'.
// Puedes sobreescribirlo con la variable de entorno VITE_BASE.
export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE || (command === 'build' ? '/MiGuantera/' : '/'),
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'MiGuantera - Documentos Vehiculares',
        short_name: 'MiGuantera',
        description:
          'Billetera digital offline para tus documentos vehiculares: licencia, padrón, permiso, revisión técnica y SOAP. 100% local y privado.',
        lang: 'es-CL',
        dir: 'ltr',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone',
        orientation: 'portrait',
        scope: './',
        start_url: './',
        categories: ['productivity', 'utilities', 'finance'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
        shortcuts: [
          {
            name: 'Modo Inspección',
            short_name: 'Inspección',
            description: 'Abrir el modo de control policial',
            url: './inspeccion',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Gestión de documentos',
            short_name: 'Gestión',
            description: 'Agregar o administrar tus documentos',
            url: './gestion',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Solo woff2 en el precache (soportado por todos los navegadores con
        // PWA); evita duplicar cada fuente en woff + woff2.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html',
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
}));
