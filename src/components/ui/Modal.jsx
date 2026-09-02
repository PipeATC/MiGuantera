import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Hoja modal deslizante desde abajo (bottom-sheet) accesible.
 * Cierra con Escape, backdrop o botón. Bloquea el scroll de fondo.
 */
export default function Modal({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Comportamiento de app: el botón "atrás" del sistema (Android / gesto)
  // cierra la hoja en vez de abandonar la app. Se apila una entrada de historial
  // al abrir; "atrás" dispara popstate y cierra. Al cerrar desde la UI se
  // consume esa entrada para no dejar historial "fantasma".
  useEffect(() => {
    if (!open) return undefined;
    window.history.pushState({ mgModal: true }, '');
    const onPop = () => onClose();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (window.history.state?.mgModal) window.history.back();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-primary-950/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-canvas pb-safe shadow-card animate-slide-up sm:rounded-xl no-scrollbar">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-xl bg-canvas/95 px-5 pb-3 pt-4 backdrop-blur">
          <div>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-primary-200 sm:hidden" />
            {subtitle && (
              <p className="text-label-caps uppercase text-primary-500">{subtitle}</p>
            )}
            {title && (
              <h2 className="text-headline-md text-primary-900">{title}</h2>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 transition active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
