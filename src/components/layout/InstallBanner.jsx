import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt.js';

const DISMISS_KEY = 'miguantera:installDismissed';

/** Banner personalizado para instalar la PWA (usa beforeinstallprompt). */
export default function InstallBanner() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (!canInstall || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-primary-900 px-5 py-4 text-white shadow-card">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <Download className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-tight">Instalar MiGuantera</p>
          <p className="text-sm text-primary-300">Accede a tus documentos sin conexión</p>
        </div>
        <button
          onClick={promptInstall}
          className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary-900 transition active:scale-95"
        >
          Instalar
        </button>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Descartar"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-primary-400 transition hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
