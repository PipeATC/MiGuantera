import { useState } from 'react';
import { FileText, RefreshCw, X } from 'lucide-react';
import DocumentUpload from './DocumentUpload.jsx';
import { useObjectUrl } from '../../hooks/useObjectUrl.js';
import { isImage, formatBytes } from '../../utils/fileUtils.js';

/**
 * Campo de carga para una cara del documento (anverso o reverso).
 *
 * Muestra la zona de carga cuando no hay archivo, o una vista previa con
 * acciones "Cambiar"/"Quitar" cuando ya existe uno (nuevo o guardado).
 *
 * Props:
 *  - label: título de la cara ("Anverso" | "Reverso").
 *  - blob, fileName, fileType, fileSize: archivo efectivo actual (o null).
 *  - onPick({ blob, fileName, fileType, fileSize }): nuevo archivo elegido.
 *  - onRemove(): quitar el archivo de esta cara.
 */
export default function DocumentSideField({
  label,
  blob,
  fileName,
  fileType,
  fileSize,
  onPick,
  onRemove,
}) {
  const [replacing, setReplacing] = useState(false);
  const previewUrl = useObjectUrl(isImage(fileType) ? blob : null);
  const hasFile = !!blob;

  const handlePick = (file) => {
    onPick(file);
    setReplacing(false);
  };

  return (
    <div>
      <p className="label-field">{label}</p>

      {hasFile && !replacing ? (
        <div className="flex items-center gap-3 rounded-lg bg-white p-2.5 shadow-card ring-1 ring-primary-100">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-100 text-primary-400">
            {previewUrl ? (
              <img src={previewUrl} alt={label} className="h-full w-full object-cover" />
            ) : (
              <FileText className="h-6 w-6" strokeWidth={1.75} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-primary-800">
              {fileName || (isImage(fileType) ? 'Imagen' : 'Documento')}
            </p>
            <p className="text-xs text-primary-500">
              {fileSize ? formatBytes(fileSize) : 'Guardado'}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => setReplacing(true)}
              aria-label={`Cambiar ${label.toLowerCase()}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-600 transition active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Quitar ${label.toLowerCase()}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-vencido-soft text-vencido-dark transition active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <DocumentUpload onFile={handlePick} compact />
          {hasFile && replacing && (
            <button
              type="button"
              onClick={() => setReplacing(false)}
              className="mt-1.5 text-xs font-semibold text-primary-500"
            >
              Cancelar
            </button>
          )}
        </>
      )}
    </div>
  );
}
