import { useEffect, useRef, useState } from 'react';
import { X, Plus, Minus, Maximize2 } from 'lucide-react';
import SwipeViewer from './SwipeViewer.jsx';

/**
 * Visor de documento a pantalla completa (Modo Inspección).
 * Intenta usar la Fullscreen API del navegador; si no está disponible,
 * igualmente cubre toda la pantalla con una capa de alto contraste.
 *
 * Props:
 *  - sides: [{ blob, fileType, fileName, label }]
 *  - title: etiqueta del documento mostrado
 *  - onClose(): cerrar el visor
 */
export default function FullscreenDoc({ sides = [], title = '', onClose }) {
  const rootRef = useRef(null);
  const [zoom, setZoom] = useState(1);

  // Intentar entrar en pantalla completa nativa al montar.
  useEffect(() => {
    const el = rootRef.current;
    if (el?.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  // Si el usuario sale de pantalla completa nativa (Esc), cerrar el visor.
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) onClose?.();
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [onClose]);

  const hasImage = sides.some((s) => s.fileType?.startsWith('image/'));

  return (
    <div ref={rootRef} className="fixed inset-0 z-[70] flex flex-col bg-black text-white">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/80">
          <Maximize2 className="h-4 w-4" /> {title}
        </span>
        <button
          onClick={onClose}
          aria-label="Cerrar pantalla completa"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 active:scale-95"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Documento */}
      <div className="relative min-h-0 flex-1 bg-white">
        {sides.length > 0 ? (
          <SwipeViewer
            sides={sides}
            zoom={zoom}
            swipeEnabled={zoom === 1}
            onIndexChange={() => setZoom(1)}
            className="p-1"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            Sin documento cargado
          </div>
        )}

        {hasImage && (
          <div className="absolute bottom-5 right-5 flex flex-col gap-2">
            <button
              onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
              aria-label="Acercar"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg active:scale-95"
            >
              <Plus className="h-7 w-7" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
              aria-label="Alejar"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg active:scale-95"
            >
              <Minus className="h-7 w-7" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
