import { useCallback, useEffect, useRef, useState } from 'react';
import { Delete, Fingerprint, ShieldCheck, Lock, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { asset } from '../../utils/assets.js';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

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
 * Pantalla de acceso.
 * - Sin PIN: guía la creación (ingresar + confirmar).
 * - Con biometría activa y la clave en memoria (volver de segundo plano): la
 *   biometría es el método principal; el PIN queda como alternativa.
 * - Arranque en frío: se pide el PIN (única forma de recuperar la clave).
 */
export default function LockScreen() {
  const { pinSet, createPin, verifyPin, unlockBiometric, securityLock, hasKey } = useApp();

  // La biometría solo desbloquea los datos si la clave sigue en memoria.
  const bioPrimary = pinSet && !!securityLock?.enabled && hasKey;

  const [stage, setStage] = useState(() => {
    if (!pinSet) return 'create';
    return bioPrimary ? 'bio' : 'pin';
  });
  const [entry, setEntry] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const bioTried = useRef(false);

  const runBiometric = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await unlockBiometric();
      if (res === 'ok') return; // la app se desbloquea (este componente se desmonta)
      if (res === 'needpin') {
        setStage('pin');
      } else {
        setError('No se pudo verificar. Usa tu huella de nuevo o tu PIN.');
      }
    } finally {
      setBusy(false);
    }
  }, [busy, unlockBiometric]);

  // Intento automático de biometría al entrar en modo 'bio'.
  useEffect(() => {
    if (stage === 'bio' && !bioTried.current) {
      bioTried.current = true;
      runBiometric();
    }
  }, [stage, runBiometric]);

  const processPin = useCallback(
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
            await createPin(pin);
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

  useEffect(() => {
    if ((stage === 'create' || stage === 'confirm' || stage === 'pin') && entry.length === 4 && !busy) {
      processPin(entry);
    }
  }, [entry, busy, stage, processPin]);

  const press = (k) => {
    if (busy) return;
    setError('');
    if (k === 'del') return setEntry((e) => e.slice(0, -1));
    if (/^\d$/.test(k)) setEntry((e) => (e.length < 4 ? e + k : e));
  };

  useEffect(() => {
    const onKey = (e) => {
      if (stage === 'bio') return;
      if (e.key >= '0' && e.key <= '9') press(e.key);
      else if (e.key === 'Backspace') press('del');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, stage]);

  const title =
    stage === 'create'
      ? 'Crea tu PIN'
      : stage === 'confirm'
        ? 'Confirma tu PIN'
        : stage === 'bio'
          ? 'Desbloquea con biometría'
          : 'Ingresa tu PIN';
  const subtitle =
    stage === 'create'
      ? 'Define un PIN de 4 dígitos para proteger tus documentos.'
      : stage === 'confirm'
        ? 'Repite el PIN para confirmarlo.'
        : stage === 'bio'
          ? 'Usa tu huella o rostro para entrar.'
          : 'Desbloquea MiGuantera para ver tus documentos.';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-7 bg-primary-950 px-6 py-10 text-center text-white">
      <div className="flex flex-col items-center gap-3">
        <img src={asset('icons/icon.svg')} alt="MiGuantera" className="h-16 w-16" />
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
          {stage === 'create' || stage === 'confirm' ? (
            <ShieldCheck className="h-6 w-6 text-brand-400" strokeWidth={2} />
          ) : stage === 'bio' ? (
            <Fingerprint className="h-6 w-6 text-brand-400" strokeWidth={2} />
          ) : (
            <Lock className="h-6 w-6 text-brand-400" strokeWidth={2} />
          )}
        </span>
        <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
        <p className="max-w-xs text-sm text-slate-300">{subtitle}</p>
      </div>

      {stage === 'bio' ? (
        <div className="flex w-full max-w-[280px] flex-col items-center gap-5">
          <button
            onClick={runBiometric}
            disabled={busy}
            aria-label="Desbloquear con biometría"
            className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-500 text-white shadow-fab transition active:scale-95 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-10 w-10 animate-spin" /> : <Fingerprint className="h-11 w-11" />}
          </button>
          {error && <p className="text-sm font-medium text-red-300">{error}</p>}
          <button
            onClick={() => {
              setError('');
              setEntry('');
              setStage('pin');
            }}
            className="text-sm font-semibold text-slate-300 underline underline-offset-4"
          >
            Usar PIN
          </button>
        </div>
      ) : (
        <>
          <PinDots length={entry.length} error={!!error} />
          <p className="min-h-[20px] text-sm font-medium text-red-300">{error}</p>

          <div className="grid w-full max-w-[280px] grid-cols-3 gap-3">
            {KEYS.map((k, i) => {
              if (k === '') return <span key={`spacer-${i}`} />;
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

          {pinSet && securityLock?.enabled && hasKey && (
            <button
              onClick={() => {
                setError('');
                setEntry('');
                bioTried.current = false;
                setStage('bio');
              }}
              className="flex items-center gap-2 text-sm font-semibold text-slate-300"
            >
              <Fingerprint className="h-4 w-4" /> Usar biometría
            </button>
          )}
        </>
      )}
    </div>
  );
}
