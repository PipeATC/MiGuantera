import { useEffect, useMemo, useRef, useState } from 'react';
import { X, RotateCw, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { useObjectUrl } from '../../hooks/useObjectUrl.js';
import { isImage, isPDF } from '../../utils/fileUtils.js';
import { selection } from '../../utils/haptics.js';

const MIN = 1;
const MAX = 5;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Visor de documento a pantalla completa (Modo Inspección).
 * - Zoom con dos dedos (pinch) y doble toque para alternar; arrastre para
 *   desplazar cuando hay zoom.
 * - Botón para girar a horizontal (orientación del dispositivo, o rotación CSS
 *   como respaldo).
 * - Deslizamiento entre anverso y reverso cuando no hay zoom.
 */
export default function FullscreenDoc({ sides = [], title = '', onClose }) {
  const rootRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [manualRot, setManualRot] = useState(0); // respaldo CSS si no hay Orientation API

  const pointers = useRef(new Map());
  const gesture = useRef({ startDist: 0, startScale: 1, lastX: 0, lastY: 0, movedX: 0, downT: 0 });
  const lastTap = useRef(0);

  const side = sides[index] || null;
  const url = useObjectUrl(side?.blob || null);
  const imageSide = isImage(side?.fileType);

  const resetView = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };
  useEffect(() => resetView(), [index]);

  // Pantalla completa nativa al montar.
  useEffect(() => {
    const el = rootRef.current;
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      try {
        if (screen.orientation?.unlock) screen.orientation.unlock();
      } catch {
        /* noop */
      }
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) onClose?.();
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [onClose]);

  const toggleRotate = async () => {
    const cur = (typeof screen !== 'undefined' && screen.orientation?.type) || '';
    try {
      if (cur.startsWith('landscape')) await screen.orientation.lock('portrait');
      else await screen.orientation.lock('landscape');
      setManualRot(0);
    } catch {
      setManualRot((r) => (r === 0 ? 90 : 0)); // respaldo: rotación CSS
    }
  };

  const go = (next) => {
    const clamped = clamp(next, 0, sides.length - 1);
    if (clamped !== index) {
      setIndex(clamped);
      selection();
    }
  };

  /* ------------------------------- gestos -------------------------------- */
  const onPointerDown = (e) => {
    if (!imageSide) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      gesture.current.startDist = dist(pts[0], pts[1]);
      gesture.current.startScale = scale;
    } else if (pts.length === 1) {
      gesture.current.lastX = e.clientX;
      gesture.current.lastY = e.clientY;
      gesture.current.movedX = 0;
      gesture.current.downT = Date.now();
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];

    if (pts.length === 2) {
      const d = dist(pts[0], pts[1]);
      if (gesture.current.startDist > 0) {
        setScale(clamp(gesture.current.startScale * (d / gesture.current.startDist), MIN, MAX));
      }
      return;
    }

    if (pts.length === 1) {
      const dx = e.clientX - gesture.current.lastX;
      const dy = e.clientY - gesture.current.lastY;
      gesture.current.lastX = e.clientX;
      gesture.current.lastY = e.clientY;
      if (scale > 1) {
        setTx((v) => v + dx);
        setTy((v) => v + dy);
      } else {
        gesture.current.movedX += dx;
      }
    }
  };

  const onPointerUp = (e) => {
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current.startDist = 0;

    if (!imageSide) return;

    // Doble toque: alterna zoom.
    const now = Date.now();
    const quick = now - gesture.current.downT < 250 && Math.abs(gesture.current.movedX) < 10;
    if (wasSingle && quick) {
      if (now - lastTap.current < 300) {
        if (scale > 1) resetView();
        else setScale(2.5);
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;
    }

    // Deslizamiento entre caras (solo sin zoom).
    if (wasSingle && scale === 1 && sides.length > 1) {
      if (gesture.current.movedX <= -60) go(index + 1);
      else if (gesture.current.movedX >= 60) go(index - 1);
    }
  };

  const rotStyle = useMemo(
    () => (manualRot ? { transform: `rotate(${manualRot}deg)` } : undefined),
    [manualRot]
  );

  return (
    <div ref={rootRef} className="fixed inset-0 z-[70] flex flex-col bg-black text-white">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 truncate text-sm font-bold uppercase tracking-widest text-white/80">
          <Maximize2 className="h-4 w-4 shrink-0" /> {title}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleRotate}
            aria-label="Girar"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 active:scale-95"
          >
            <RotateCw className="h-6 w-6" />
          </button>
          <button
            onClick={onClose}
            aria-label="Cerrar pantalla completa"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 active:scale-95"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Documento */}
      <div className="relative min-h-0 flex-1 overflow-hidden" style={rotStyle}>
        {!side ? (
          <div className="flex h-full items-center justify-center text-slate-500">Sin documento cargado</div>
        ) : imageSide ? (
          <div
            className="h-full w-full touch-none select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ cursor: scale > 1 ? 'grab' : 'default' }}
          >
            <img
              src={url}
              alt={title}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              className="h-full w-full object-contain"
              style={{
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                transition: pointers.current.size ? 'none' : 'transform 120ms ease-out',
              }}
            />
          </div>
        ) : isPDF(side.fileType) ? (
          <iframe src={url} title={title} className="h-full w-full border-0 bg-white" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            Formato no previsualizable
          </div>
        )}

        {/* Flechas entre caras (sin zoom) */}
        {sides.length > 1 && scale === 1 && (
          <>
            {index > 0 && (
              <button
                onClick={() => go(index - 1)}
                aria-label="Cara anterior"
                className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 active:scale-95"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
            )}
            {index < sides.length - 1 && (
              <button
                onClick={() => go(index + 1)}
                aria-label="Cara siguiente"
                className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 active:scale-95"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Indicadores + ayuda */}
      <div className="flex flex-col items-center gap-2 py-3">
        {sides.length > 1 && (
          <div className="flex items-center justify-center gap-2">
            {sides.map((s, i) => (
              <button
                key={s.label + i}
                onClick={() => go(i)}
                aria-label={`Ver ${s.label}`}
                className={`h-2.5 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2.5 bg-white/40'}`}
              />
            ))}
          </div>
        )}
        {imageSide && (
          <p className="text-xs text-white/50">Pellizca para hacer zoom · doble toque para ajustar</p>
        )}
      </div>
    </div>
  );
}
