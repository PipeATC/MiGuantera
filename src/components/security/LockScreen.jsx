import { useCallback, useEffect, useRef, useState } from 'react';
import { Fingerprint, Lock, Loader2, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { asset } from '../../utils/assets.js';
import { verifyDeviceCredential } from '../../utils/deviceAuth.js';

/**
 * Pantalla de bloqueo. Exige verificar al usuario con el método del dispositivo
 * (biometría / PIN) antes de mostrar los documentos. Se intenta automáticamente
 * al montar; si falla o se cancela, el usuario puede reintentar.
 */
export default function LockScreen() {
  const { securityLock, unlock } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const attempted = useRef(false);

  const authenticate = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const ok = await verifyDeviceCredential(securityLock?.credentialId);
      if (ok) unlock();
      else setError('No se pudo verificar tu identidad. Inténtalo de nuevo.');
    } catch (err) {
      // NotAllowedError: cancelado o agotado el tiempo.
      setError(
        err?.name === 'NotAllowedError'
          ? 'Verificación cancelada. Toca para volver a intentar.'
          : 'No se pudo iniciar la verificación en este dispositivo.'
      );
    } finally {
      setBusy(false);
    }
  }, [busy, securityLock, unlock]);

  // Intento automático al abrir la app.
  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    authenticate();
  }, [authenticate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-primary-950 px-6 text-center text-white">
      <img src={asset('icons/icon.svg')} alt="MiGuantera" className="h-16 w-16" />

      <div className="flex flex-col items-center gap-2">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
          {busy ? (
            <Loader2 className="h-9 w-9 animate-spin text-brand-400" />
          ) : (
            <Lock className="h-9 w-9 text-brand-400" strokeWidth={2} />
          )}
        </span>
        <h1 className="text-xl font-extrabold tracking-tight">MiGuantera está bloqueada</h1>
        <p className="max-w-xs text-sm text-slate-300">
          {busy
            ? 'Verificando con el método de seguridad de tu dispositivo…'
            : 'Desbloquea con la biometría o el PIN de tu dispositivo para ver tus documentos.'}
        </p>
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-950/50 px-4 py-2 text-sm font-medium text-red-300 ring-1 ring-red-500/30">
          <ShieldAlert className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <button
        onClick={authenticate}
        disabled={busy}
        className="flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2.5 rounded-xl bg-brand-500 font-bold text-white shadow-fab transition active:scale-[0.98] disabled:opacity-60"
      >
        <Fingerprint className="h-6 w-6" strokeWidth={2.25} />
        {busy ? 'Verificando…' : 'Desbloquear'}
      </button>
    </div>
  );
}
