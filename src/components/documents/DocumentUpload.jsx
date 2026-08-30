import { useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { compressImage } from '../../utils/imageCompression.js';
import { formatBytes, isImage } from '../../utils/fileUtils.js';

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

/**
 * Zona de carga por Input o Drag & Drop.
 * Comprime imágenes antes de entregar el Blob resultante al padre.
 * onFile({ blob, fileName, fileType, fileSize })
 */
export default function DocumentUpload({ onFile, currentName }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (files) => {
    setError('');
    const file = files && files[0];
    if (!file) return;

    const okType = ACCEPT.split(',').includes(file.type);
    if (!okType) {
      setError('Formato no soportado. Usa JPG, PNG o PDF.');
      return;
    }

    setBusy(true);
    try {
      let blob = file;
      if (isImage(file.type)) {
        blob = await compressImage(file);
      }
      onFile({
        blob,
        fileName: file.name,
        fileType: blob.type || file.type,
        fileSize: blob.size,
      });
    } catch {
      setError('No se pudo procesar el archivo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragging
            ? 'border-brand-500 bg-brand-500/5'
            : 'border-primary-200 bg-primary-50 hover:border-primary-300'
        }`}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600">
          {busy ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : (
            <FileUp className="h-7 w-7" strokeWidth={1.75} />
          )}
        </span>
        <span className="text-lg font-semibold text-primary-800">
          {busy ? 'Procesando…' : 'Arrastra tu archivo aquí'}
        </span>
        <span className="text-sm text-primary-500">o toca para seleccionar</span>
        <span className="mt-1 flex gap-2">
          {['PDF', 'JPG', 'PNG'].map((f) => (
            <span
              key={f}
              className="rounded-md bg-primary-200/70 px-2.5 py-1 text-xs font-bold text-primary-600"
            >
              {f}
            </span>
          ))}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {currentName && !error && (
        <p className="mt-2 truncate text-center text-sm text-primary-500">
          Archivo actual: <span className="font-medium text-primary-700">{currentName}</span>
        </p>
      )}
      {error && <p className="mt-2 text-center text-sm font-medium text-vencido">{error}</p>}
    </div>
  );
}

export { formatBytes };
