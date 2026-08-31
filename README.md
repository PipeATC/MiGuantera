# MiGuantera 🚗📁

**Billetera digital _offline-first_ para tus documentos vehiculares y de identidad.**
Guarda, organiza y exhibe tu cédula de identidad, licencia, padrón, permiso de circulación, revisión técnica, certificado de gases y SOAP — todo **100% local y privado**, sin backend ni APIs externas.

> PWA instalable · funciona sin conexión tras el primer render · tus documentos nunca salen de tu navegador.

---

## ✨ Características

- **Offline-first real.** El _app shell_ y los assets se cachean con un Service Worker (Workbox). Los documentos (JPG/PNG/PDF) se guardan como `Blob` en **IndexedDB**, evitando el límite de ~5 MB de `localStorage`.
- **Anverso y reverso.** Cada documento admite dos caras (frontal y posterior). En el visor se cambia de cara con un **deslizamiento (swipe)**, flechas o puntos indicadores.
- **Cédula de Identidad.** Documento personal del titular, junto a la licencia, con exhibición directa en Modo Inspección.
- **Bloqueo de seguridad.** Compuerta al abrir la app con el **método nativo del dispositivo** vía WebAuthn: biometría (huella / rostro) en el teléfono o Windows Hello (PIN / huella) en el computador. La credencial es una passkey de plataforma ligada al dispositivo; no viaja a ningún servidor.
- **Modo Control Policial.** Botón directo desde la Home. Renderizador full-screen de alto contraste, barra inferior fija para cambiar de documento con un toque (Cédula · Licencia · Padrón · Permiso · Revisión · Gases · SOAP), la **cédula se muestra primero**, swipe entre caras, zoom con botones grandes y **pantalla siempre encendida** (`navigator.wakeLock`).
- **Gestión de documentos.** Subida por _input_ o **drag & drop**, **compresión de imágenes en cliente** (canvas) antes de guardar, y **estado de vencimiento** (días restantes, "Por Vencer", "Vencido").
- **Recordatorios de vencimiento.** Evaluación local al abrir la app + **notificaciones locales** (con permiso del usuario), sin push server.
- **Respaldo completo.** Exportar / Importar en **JSON con archivos en Base64**.
- **Instalación personalizada.** Prompt propio "Instalar Aplicación" vía `beforeinstallprompt`.

## 🧱 Stack

- **React 18 + Vite**
- **Tailwind CSS** (design system _Tactile Modernism_)
- **lucide-react** (iconos)
- **idb** (wrapper de IndexedDB)
- **vite-plugin-pwa** (Workbox: Service Worker + manifest)
- **react-router-dom**

## 🎨 Diseño

Basado en el sistema _Tactile Digital Vault_ (archivos de Stitch):

| Rol | Color |
| --- | --- |
| Primario / estructura | `#0F172A` |
| Lienzo | `#F7F9FB` |
| Vigente | `#10B981` |
| Por vencer | `#F59E0B` |
| Vencido | `#EF4444` |

Tipografía **Inter**; tarjetas `rounded-xl` con sombra ambiental suave; navegación inferior con _glassmorphism_.

## 🚀 Desarrollo

```bash
npm install      # instalar dependencias
npm run dev      # servidor de desarrollo (http://localhost:5173)
npm run build    # build de producción (genera SW + manifest en dist/)
npm run preview  # previsualizar el build
```

> El Service Worker está desactivado en `dev` para evitar cachés molestas. Para probar el comportamiento PWA completo usa `npm run build && npm run preview`.

## 🗂️ Estructura

```
src/
├── main.jsx                 # Punto de entrada + Router + Provider
├── App.jsx                  # Layout y rutas
├── index.css                # Tailwind + componentes tácticos
├── context/
│   └── AppContext.jsx       # Estado global (vehículos, documentos, ajustes)
├── db/
│   └── database.js          # IndexedDB (idb): CRUD + respaldo + storage estimate
├── hooks/
│   ├── useInstallPrompt.js  # beforeinstallprompt
│   ├── useWakeLock.js       # navigator.wakeLock (Modo Inspección)
│   ├── useOnlineStatus.js   # navigator.onLine
│   └── useObjectUrl.js      # object URLs para Blobs
├── utils/
│   ├── docTypes.js          # Catálogo de tipos de documento
│   ├── dateUtils.js         # Cálculo de vencimiento y formato
│   ├── fileUtils.js         # Blob <-> Base64/DataURL, descarga
│   ├── imageCompression.js  # Compresión con canvas
│   ├── backup.js            # Exportar / Importar JSON (Base64)
│   ├── deviceAuth.js        # Bloqueo con biometría / PIN (WebAuthn)
│   └── reminders.js         # Recordatorios + notificaciones locales
├── components/
│   ├── layout/              # TopBar, BottomNav, InstallBanner
│   ├── ui/                  # Modal, StatusBadge, FileViewer, SwipeViewer, EmptyState
│   ├── documents/           # DocumentCard/Form/Upload/SideField, LicenseCard, ReminderBanner
│   ├── security/            # LockScreen (compuerta de bloqueo)
│   └── vehicles/            # VehicleSelector, VehicleForm
└── pages/
    ├── HomePage.jsx         # Dashboard (Inicio)
    ├── InspectionPage.jsx   # Modo Control Policial
    ├── ManagementPage.jsx   # Gestión de documentos
    └── SettingsPage.jsx     # Ajustes / respaldo / privacidad
```

## 🔐 Privacidad

No hay servidor. No hay analítica. No hay red (más allá de cargar la propia app).
Todos los datos viven en el `IndexedDB` de **tu** navegador. Para moverlos a otro dispositivo, usa **Exportar respaldo** y luego **Importar** en el destino.

## 📱 Modelo de datos

```ts
Vehicle  = { id, name, plate, brand, model, year, type }
Document = { id, vehicleId, type,
             fileName, fileBlob, fileType, fileSize,          // anverso
             backFileName, backBlob, backFileType, backFileSize, // reverso
             issueDate, expiryDate, number, lastUpdated }
// type ∈ 'cedula' | 'licencia' | 'padron' | 'permiso' | 'revision' | 'gases' | 'soap'

// Ajuste de seguridad (IndexedDB store `settings`)
securityLock = { enabled, credentialId, method: 'webauthn', createdAt }
```

---

Hecho con foco en la utilidad, la confianza y el acceso inmediato — incluso en una fiscalización al costado de la ruta.
