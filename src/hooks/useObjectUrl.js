import { useEffect, useState } from 'react';

/**
 * Crea (y revoca automáticamente) una object URL para un Blob.
 * Devuelve null si no hay blob.
 */
export function useObjectUrl(blob) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  return url;
}
