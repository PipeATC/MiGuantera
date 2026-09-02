import { useState } from 'react';
import { ShieldAlert, Loader2, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

/**
 * Aviso destacado cuando el navegador NO garantiza el almacenamiento (podría
 * borrar los datos al cerrar la app). Ofrece pedir almacenamiento persistente
 * desde un gesto del usuario (mayor probabilidad de que se conceda) y explica
 * cómo evitar la pérdida de datos.
 *
 * Solo aparece cuando la persistencia es soportada pero no está concedida.
 */
export default function StorageWarning() {
  const { storagePersisted, storagePersistenceSupported, protectStorage } = useApp();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // null | 'ok' | 'fail'

  if (!storagePersistenceSupported) return null;
  if (storagePersisted && result !== 'fail') return null;

  const handleProtect = async () => {
    setBusy(true);
    try {
      const ok = await protectStorage();
      setResult(ok ? 'ok' : 'fail');
    } finally {
      setBusy(false);
    }
  };

  if (result === 'ok') return null;

  return (
    <section className="overflow-hidden rounded-xl bg-porvencer-soft p-4 ring-1 ring-porvencer/30">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-porvencer/20 text-porvencer-dark">
          <ShieldAlert className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-porvencer-dark">Protege tus datos</p>
          <p className="mt-0.5 text-sm text-porvencer-dark/90">
            Este navegador podría borrar tus documentos al cerrar la app. Toca para
            protegerlos.
          </p>
          {result === 'fail' && (
            <p className="mt-2 text-xs font-medium text-porvencer-dark">
              El navegador no concedió la protección. Para no perder datos:{' '}
              <strong>instala la app</strong> (menú → Agregar a pantalla de inicio) y ábrela
              desde ahí, evita el modo incógnito/secreto y no la desinstales.
            </p>
          )}
          <button
            onClick={handleProtect}
            disabled={busy}
            className="mt-3 flex items-center gap-2 rounded-lg bg-porvencer-dark px-4 py-2 text-sm font-bold text-white transition active:scale-95 disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Protegiendo…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Proteger mis datos
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
