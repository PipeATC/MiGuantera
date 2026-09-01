import { useCallback, useEffect, useRef, useState } from 'react';
import { Delete, Fingerprint, ShieldCheck, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { asset } from '../../utils/assets.js';
import { verifyDeviceCredential } from '../../utils/deviceAuth.js';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/** Cuatro puntos que reflejan los dígitos ingresados. */
function PinDots({ length, error }) {
  return (
    <div className={`flex items-center justify-center gap-4 ${error ? 'animate-shake' : ''}`}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-4 w-4 rounded-full transition-all ${
            i < length ? 'scale-100 bg-brand-400' : 'scale-90 bg-white/15'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Pantalla de acceso con PIN de 4 dígitos.
 * - Si no hay PIN, guía la creación (ingresar + confirmar).
 * - Si ya existe, pide ingresarlo. La biometría es un atajo opcional.
 */
export default function LockScreen() {
  const { pinSet, createPin, verifyPin, unlock, securityLock } = useApp();
  const [stage, setStage] = useState(pinSet ? 'unlock' : 'create'); // create | confirm | unlock
  const [entry, setEntry] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const bioTried = useRef(false);

  const biometricEnabled = !!securityLock?.enabled;

  const process = useCallback(
    async (pin) => {
      setBusy(true);
      try {
        if (stage === 'create') {
          setFirstPin(pin);
          setEntry('');
          setError('');
          setStage('confirm');
        } else if (stage === 'confirm') {
          if (pin === firstPin) {
            await createPin(pin); // desbloquea al crear
          } else {
            setError('Los PIN no coinciden. Vuelve a intentarlo.');
            setFirstPin('');
            setEntry('');
            setStage('create');
          }
        } else {
          const ok = await verifyPin(pin);
          if (!ok) {
            setError('PIN incorrecto.');
            setEntry('');
          }
        }
      } finally {
        setBusy(false);
      }
    },
    [stage, firstPin, createPin, verifyPin]
  );

  // Procesa automáticamente al completar 4 dígitos.
  useEffect(() => {
    if (entry.length === 4 && !busy) process(entry);
  }, [entry, busy, process]);

  const press = (k) => {
    if (busy) return;
    setError('');
    if (k === 'del') return setEntry((e) => e.slice(0, -1));
    if (/^\d$/.test(k)) setEntry((e) => (e.length < 4 ? e + k : e));
  };

  // Teclado físico (escritorio).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') press(e.key);
      else if (e.key === 'Backspace') press('del');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  const authBiometric = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const ok = await verifyDeviceCredential(securityLock?.credentialId);
      if (ok) unlock();
      else setError('No se pudo verificar la biometría. Usa tu PIN.');
    } catch (err) {
      setError(
        err?.name === 'NotAllowedError'
          ? 'Verificación cancelada. Usa tu PIN.'
          : 'Biometría no disponible. Usa tu PIN.'
      );
    } finally {
      setBusy(false);
    }
  }, [busy, securityLock, unlock]);

  // Intento automático de biometría al abrir (solo modo desbloqueo).
  useEffect(() => {
    if (stage === 'unlock' && biometricEnabled && !bioTried.current) {
      bioTried.current = true;
      authBiometric();
    }
  }, [stage, biometricEnabled, authBiometric]);

  const title =
    stage === 'create'
      ? 'Crea tu PIN'
      : stage === 'confirm'
        ? 'Confirma tu PIN'
        : 'Ingresa tu PIN';
  const subtitle =
    stage === 'create'
      ? 'Define un PIN de 4 dígitos para proteger tus documentos.'
      : stage === 'confirm'
        ? 'Repite el PIN para confirmarlo.'
        : 'Desbloquea MiGuantera para ver tus documentos.';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-7 bg-primary-950 px-6 py-10 text-center text-white">
      <div className="flex flex-col items-center gap-3">
        <img src={asset('icons/icon.svg')} alt="MiGuantera" className="h-16 w-16" />
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
          {stage === 'create' || stage === 'confirm' ? (
            <ShieldCheck className="h-6 w-6 text-brand-400" strokeWidth={2} />
          ) : (
            <Lock className="h-6 w-6 text-brand-400" strokeWidth={2} />
          )}
        </span>
        <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
        <p className="max-w-xs text-sm text-slate-300">{subtitle}</p>
      </div>

      <PinDots length={entry.length} error={!!error} />

      <p className="min-h-[20px] text-sm font-medium text-red-300">{error}</p>

      {/* Teclado numérico */}
      <div className="grid w-full max-w-[280px] grid-cols-3 gap-3">
        {KEYS.map((k, i) => {
          if (k === '') {
            // Hueco inferior izquierdo: biometría si está disponible.
            return biometricEnabled && stage === 'unlock' ? (
              <button
                key="bio"
                onClick={authBiometric}
                disabled={busy}
                aria-label="Usar biometría"
                className="flex h-16 items-center justify-center rounded-2xl bg-white/5 text-brand-400 transition active:scale-95 disabled:opacity-50"
              >
                <Fingerprint className="h-7 w-7" />
              </button>
            ) : (
              <span key={`spacer-${i}`} />
            );
          }
          if (k === 'del') {
            return (
              <button
                key="del"
                onClick={() => press('del')}
                disabled={busy}
                aria-label="Borrar"
                className="flex h-16 items-center justify-center rounded-2xl bg-white/5 text-white transition active:scale-95 disabled:opacity-50"
              >
                <Delete className="h-7 w-7" />
              </button>
            );
          }
          return (
            <button
              key={k}
              onClick={() => press(k)}
              disabled={busy}
              className="flex h-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold tabular text-white transition active:scale-95 disabled:opacity-50"
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
