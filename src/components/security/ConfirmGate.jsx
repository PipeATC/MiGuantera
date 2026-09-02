import { useCallback, useEffect, useRef, useState } from 'react';
import { Fingerprint, Delete, Lock, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/**
 * Compuerta de confirmación centrada (sin scroll) para acciones sensibles como
 * guardar un documento. Usa biometría si está activa; si no, o si el usuario
 * elige, pide el PIN. Llama onConfirm() al verificar correctamente.
 */
export default function ConfirmGate({ title = 'Confirmar', onConfirm, onCancel }) {
  const { securityLock, confirmBiometric, verifyPin } = useApp();
  const bioEnabled = !!securityLock?.enabled;

  const [mode, setMode] = useState(bioEnabled ? 'bio' : 'pin');
  const [entry, setEntry] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const bioTried = useRef(false);
  const doneRef = useRef(false); // evita confirmar dos veces (doble guardado)

  const runBio = useCallback(async () => {
    if (busy || doneRef.current) return;
    setBusy(true);
    setError('');
    try {
      const ok = await confirmBiometric();
      if (ok) {
        doneRef.current = true;
        onConfirm?.();
      } else {
        setError('No se pudo verificar. Reintenta o usa tu PIN.');
      }
    } finally {
      setBusy(false);
    }
  }, [busy, confirmBiometric, onConfirm]);

  useEffect(() => {
    if (mode === 'bio' && !bioTried.current) {
      bioTried.current = true;
      runBio();
    }
  }, [mode, runBio]);

  const submitPin = useCallback(
    async (pin) => {
      if (doneRef.current) return;
      setBusy(true);
      try {
        const ok = await verifyPin(pin);
        if (ok) {
          doneRef.current = true;
          onConfirm?.();
        } else {
          setError('PIN incorrecto.');
          setEntry('');
        }
      } finally {
        setBusy(false);
      }
    },
    [verifyPin, onConfirm]
  );

  useEffect(() => {
    if (mode === 'pin' && entry.length === 4 && !busy && !doneRef.current) submitPin(entry);
  }, [entry, busy, mode, submitPin]);

  const press = (k) => {
    if (busy) return;
    setError('');
    if (k === 'del') return setEntry((e) => e.slice(0, -1));
    if (/^\d$/.test(k)) setEntry((e) => (e.length < 4 ? e + k : e));
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-primary-950/70 p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-canvas p-6 shadow-card">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            {mode === 'bio' ? <Fingerprint className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </span>
          <h2 className="text-headline-sm text-primary-900">{title}</h2>
          <p className="text-sm text-primary-500">
            {mode === 'bio'
              ? 'Confirma con tu huella o rostro.'
              : 'Ingresa tu PIN para confirmar.'}
          </p>
        </div>

        {mode === 'bio' ? (
          <div className="mt-6 flex flex-col items-center gap-4">
            <button
              onClick={runBio}
              disabled={busy}
              aria-label="Confirmar con biometría"
              className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-500 text-white shadow-fab transition active:scale-95 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-9 w-9 animate-spin" /> : <Fingerprint className="h-10 w-10" />}
            </button>
            {error && <p className="text-sm font-medium text-vencido">{error}</p>}
            <button
              onClick={() => {
                setError('');
                setEntry('');
                setMode('pin');
              }}
              className="text-sm font-semibold text-primary-500 underline underline-offset-4"
            >
              Usar PIN
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-3.5 w-3.5 rounded-full ${i < entry.length ? 'bg-primary-900' : 'bg-primary-200'}`}
                />
              ))}
            </div>
            {error && <p className="text-sm font-medium text-vencido">{error}</p>}
            <div className="grid w-full max-w-[260px] grid-cols-3 gap-2.5">
              {KEYS.map((k, i) => {
                if (k === '') return <span key={`s-${i}`} />;
                if (k === 'del') {
                  return (
                    <button
                      key="del"
                      onClick={() => press('del')}
                      disabled={busy}
                      aria-label="Borrar"
                      className="flex h-14 items-center justify-center rounded-xl bg-primary-100 text-primary-700 transition active:scale-95 disabled:opacity-50"
                    >
                      <Delete className="h-6 w-6" />
                    </button>
                  );
                }
                return (
                  <button
                    key={k}
                    onClick={() => press(k)}
                    disabled={busy}
                    className="tabular flex h-14 items-center justify-center rounded-xl bg-primary-100 text-xl font-bold text-primary-900 transition active:scale-95 disabled:opacity-50"
                  >
                    {k}
                  </button>
                );
              })}
            </div>
            {bioEnabled && (
              <button
                onClick={() => {
                  setError('');
                  bioTried.current = false;
                  setMode('bio');
                }}
                className="flex items-center gap-2 text-sm font-semibold text-primary-500"
              >
                <Fingerprint className="h-4 w-4" /> Usar biometría
              </button>
            )}
          </div>
        )}

        <button
          onClick={onCancel}
          disabled={busy}
          className="mt-5 w-full text-sm font-semibold text-primary-400 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
