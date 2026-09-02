import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import FileViewer from './FileViewer.jsx';
import { selection } from '../../utils/haptics.js';

/**
 * Visor con navegación por deslizamiento (swipe) entre las caras de un
 * documento: anverso y reverso. En pantallas táctiles se cambia de cara
 * arrastrando; en escritorio con las flechas laterales, los puntos o el teclado.
 *
 * Props:
 *  - sides: [{ blob, fileType, fileName, label }] (se ignoran las sin blob).
 *  - zoom: escala aplicada a la cara activa (imágenes).
 *  - onIndexChange(i): notifica el cambio de cara (p. ej. para reiniciar zoom).
 *  - swipeEnabled: habilita el arrastre (se desactiva al hacer zoom).
 */
export default function SwipeViewer({
  sides = [],
  zoom = 1,
  onIndexChange,
  swipeEnabled = true,
  className = '',
}) {
  const available = sides.filter((s) => s && s.blob);
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0); // desplazamiento visual mientras se arrastra
  const startX = useRef(null);
  const count = available.length;

  // Mantener el índice dentro de rango si cambian las caras disponibles.
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, count - 1)));
  }, [count]);

  const go = (next) => {
    const clamped = Math.max(0, Math.min(count - 1, next));
    if (clamped !== index) {
      setIndex(clamped);
      onIndexChange?.(clamped);
      selection();
    }
  };

  // Teclado (escritorio).
  useEffect(() => {
    if (count < 2) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(index - 1);
      if (e.key === 'ArrowRight') go(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, count]); // eslint-disable-line react-hooks/exhaustive-deps

  if (count === 0) return null;

  const canSwipe = swipeEnabled && count > 1;

  const onTouchStart = (e) => {
    if (!canSwipe) return;
    startX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e) => {
    if (!canSwipe || startX.current == null) return;
    setDrag(e.touches[0].clientX - startX.current);
  };
  const onTouchEnd = () => {
    if (startX.current == null) return;
    const threshold = 50;
    if (drag <= -threshold) go(index + 1);
    else if (drag >= threshold) go(index - 1);
    startX.current = null;
    setDrag(0);
  };

  const active = available[index];

  return (
    <div className={`relative flex h-full w-full flex-col ${className}`}>
      <div
        className="relative min-h-0 flex-1 touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: drag ? `translateX(${drag * 0.25}px)` : undefined,
          transition: drag ? 'none' : 'transform 150ms ease-out',
        }}
      >
        <FileViewer
          key={index}
          blob={active.blob}
          fileType={active.fileType}
          fileName={active.fileName}
          zoom={zoom}
          className="h-full w-full"
        />

        {/* Etiqueta de la cara actual */}
        {count > 1 && (
          <span className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-slate-900/75 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white shadow">
            {active.label}
          </span>
        )}

        {/* Flechas laterales */}
        {count > 1 && index > 0 && (
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Cara anterior"
            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/60 text-white shadow-lg backdrop-blur active:scale-95"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {count > 1 && index < count - 1 && (
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Cara siguiente"
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/60 text-white shadow-lg backdrop-blur active:scale-95"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Puntos indicadores */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          {available.map((s, i) => (
            <button
              key={s.label + i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Ver ${s.label}`}
              className={`h-2.5 rounded-full transition-all ${
                i === index ? 'w-6 bg-slate-800' : 'w-2.5 bg-slate-400/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
