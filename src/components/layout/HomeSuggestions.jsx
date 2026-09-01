import { useEffect, useState } from 'react';
import { Fingerprint, BellRing, DatabaseBackup, X, Sparkles, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { isDeviceAuthSupported } from '../../utils/deviceAuth.js';
import {
  notificationsSupported,
  notificationPermission,
  requestNotificationPermission,
} from '../../utils/reminders.js';
import { exportBackup } from '../../utils/backup.js';

/**
 * Nota de sugerencias en la Home: activar biometría, notificaciones y respaldo.
 * Cada sugerencia se puede ignorar y no se vuelve a mostrar (persistido).
 */
export default function HomeSuggestions() {
  const { securityLock, enableSecurityLock, dismissedTips, dismissTip } = useApp();
  const [bioSupported, setBioSupported] = useState(false);
  const [notifPerm, setNotifPerm] = useState(notificationPermission());
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    isDeviceAuthSupported().then(setBioSupported);
  }, []);

  const flash = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 2400);
  };

  const handleBiometric = async () => {
    setBusy('biometric');
    try {
      await enableSecurityLock();
      flash('Biometría activada.');
    } catch (err) {
      flash(err?.name === 'NotAllowedError' ? 'Activación cancelada.' : 'No se pudo activar la biometría.');
    } finally {
      setBusy('');
    }
  };

  const handleNotifs = async () => {
    setBusy('notifications');
    const perm = await requestNotificationPermission();
    setNotifPerm(perm);
    flash(perm === 'granted' ? 'Notificaciones activadas.' : 'Permiso no concedido.');
    setBusy('');
  };

  const handleBackup = async () => {
    setBusy('backup');
    try {
      await exportBackup();
      flash('Respaldo generado.');
    } catch {
      flash('No se pudo generar el respaldo.');
    } finally {
      setBusy('');
    }
  };

  const tips = [
    {
      key: 'biometric',
      show: bioSupported && !securityLock?.enabled,
      icon: Fingerprint,
      title: 'Activa la biometría',
      desc: 'Desbloquea con huella o rostro además del PIN.',
      cta: 'Activar',
      onClick: handleBiometric,
    },
    {
      key: 'notifications',
      show: notificationsSupported() && notifPerm !== 'granted' && notifPerm !== 'denied',
      icon: BellRing,
      title: 'Activa las notificaciones',
      desc: 'Recibe avisos antes de que venzan tus documentos.',
      cta: 'Activar',
      onClick: handleNotifs,
    },
    {
      key: 'backup',
      show: true,
      icon: DatabaseBackup,
      title: 'Haz un respaldo',
      desc: 'Exporta tus documentos para no perderlos.',
      cta: 'Exportar',
      onClick: handleBackup,
    },
  ].filter((t) => t.show && !dismissedTips[t.key]);

  if (tips.length === 0) return null;

  return (
    <section className="card-tactile overflow-hidden p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <h2 className="text-label-caps uppercase tracking-wide text-primary-500">Sugerencias</h2>
      </div>

      <div className="space-y-2">
        {tips.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              className="flex items-center gap-3 rounded-lg bg-primary-50 px-3 py-2.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-tight text-primary-900">{t.title}</p>
                <p className="truncate text-xs text-primary-500">{t.desc}</p>
              </div>
              <button
                onClick={t.onClick}
                disabled={busy === t.key}
                className="shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-bold text-white transition active:scale-95 disabled:opacity-60"
              >
                {busy === t.key ? '…' : t.cta}
              </button>
              <button
                onClick={() => dismissTip(t.key)}
                aria-label="Ignorar sugerencia"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-400 transition active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {msg && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-vigente-dark">
          <Check className="h-3.5 w-3.5" /> {msg}
        </p>
      )}
    </section>
  );
}
