import { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useApp } from './context/AppContext.jsx';
import { asset } from './utils/assets.js';
import TopBar from './components/layout/TopBar.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import HomePage from './pages/HomePage.jsx';
import InspectionPage from './pages/InspectionPage.jsx';
import ManagementPage from './pages/ManagementPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import LockScreen from './components/security/LockScreen.jsx';
import SharedImport from './components/documents/SharedImport.jsx';

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-primary-950 text-white">
      <img src={asset('icons/icon.svg')} alt="MiGuantera" className="h-20 w-20 animate-fade-in" />
      <p className="text-lg font-extrabold tracking-tight">MiGuantera</p>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-500" />
      </div>
    </div>
  );
}

export default function App() {
  const { loading, authed } = useApp();
  const location = useLocation();
  const isInspection = location.pathname === '/inspeccion';

  // Color de la barra de estado (theme-color) adaptado a la pantalla, como una
  // app nativa: oscuro en bloqueo/splash, negro en inspección a pantalla
  // completa y claro (lienzo) en la app normal.
  useEffect(() => {
    const color = !authed || loading
      ? '#020617'
      : isInspection
        ? '#000000'
        : '#F7F9FB';
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', color);
  }, [authed, loading, isInspection]);

  if (loading) return <Splash />;

  // Compuerta de acceso: PIN obligatorio (crear o ingresar) antes de la app.
  if (!authed) return <LockScreen />;

  // Modo Inspección: pantalla completa sin chrome
  if (isInspection) {
    return (
      <Routes>
        <Route path="/inspeccion" element={<InspectionPage />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <TopBar />
      <main>
        {/* La `key` por ruta re-monta el contenedor para animar la entrada de
            cada pantalla, dando una sensación de navegación de app. */}
        <div key={location.pathname} className="page-enter">
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/gestion" element={<ManagementPage />} />
            <Route path="/ajustes" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
      <BottomNav />
      {/* Importador del Share Target: aparece si el usuario compartió un
          archivo hacia la app desde otra aplicación. */}
      <SharedImport />
    </div>
  );
}
