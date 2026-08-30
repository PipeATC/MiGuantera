import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useApp } from './context/AppContext.jsx';
import TopBar from './components/layout/TopBar.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import HomePage from './pages/HomePage.jsx';
import InspectionPage from './pages/InspectionPage.jsx';
import ManagementPage from './pages/ManagementPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-primary-950 text-white">
      <img src="/icons/icon.svg" alt="MiGuantera" className="h-20 w-20 animate-fade-in" />
      <p className="text-lg font-extrabold tracking-tight">MiGuantera</p>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-500" />
      </div>
    </div>
  );
}

export default function App() {
  const { loading } = useApp();
  const location = useLocation();
  const isInspection = location.pathname === '/inspeccion';

  if (loading) return <Splash />;

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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/gestion" element={<ManagementPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
