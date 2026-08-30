import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Mantiene la pantalla encendida usando la Screen Wake Lock API.
 * Se usa en el Modo Control Policial para que la pantalla no se apague
 * durante una inspección.
 *
 * Re-adquiere el lock automáticamente al volver a visibilidad (el lock
 * se libera si el usuario cambia de pestaña).
 */
export function useWakeLock(active) {
  const sentinelRef = useRef(null);
  const [isLocked, setIsLocked] = useState(false);
  const supported =
    typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  const acquire = useCallback(async () => {
    if (!supported) return;
    try {
      sentinelRef.current = await navigator.wakeLock.request('screen');
      setIsLocked(true);
      sentinelRef.current.addEventListener('release', () => {
        setIsLocked(false);
      });
    } catch {
      setIsLocked(false);
    }
  }, [supported]);

  const release = useCallback(async () => {
    try {
      if (sentinelRef.current) {
        await sentinelRef.current.release();
        sentinelRef.current = null;
      }
    } catch {
      /* ignore */
    }
    setIsLocked(false);
  }, []);

  useEffect(() => {
    if (!active || !supported) return undefined;

    acquire();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        acquire();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, supported]);

  return { supported, isLocked };
}
