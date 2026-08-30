import { FileQuestion } from 'lucide-react';
import { useObjectUrl } from '../../hooks/useObjectUrl.js';
import { isImage, isPDF } from '../../utils/fileUtils.js';

/**
 * Renderiza el archivo de un documento (imagen o PDF) desde su Blob.
 * `zoom` escala imágenes (usado en Modo Control). `fit` controla object-fit.
 */
export default function FileViewer({
  blob,
  fileType,
  fileName,
  zoom = 1,
  fit = 'contain',
  className = '',
}) {
  const url = useObjectUrl(blob);

  if (!blob || !url) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 text-center text-primary-400 ${className}`}
      >
        <FileQuestion className="h-12 w-12" strokeWidth={1.5} />
        <p className="text-sm font-medium">Sin archivo cargado</p>
      </div>
    );
  }

  if (isImage(fileType)) {
    return (
      <div className={`flex items-center justify-center overflow-auto ${className}`}>
        <img
          src={url}
          alt={fileName || 'Documento'}
          draggable={false}
          className="select-none transition-transform duration-150"
          style={{
            transform: `scale(${zoom})`,
            objectFit: fit,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />
      </div>
    );
  }

  if (isPDF(fileType)) {
    return (
      <iframe
        src={url}
        title={fileName || 'Documento PDF'}
        className={`h-full w-full border-0 bg-white ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center text-primary-400 ${className}`}
    >
      <FileQuestion className="h-12 w-12" strokeWidth={1.5} />
      <p className="text-sm font-medium">Formato no previsualizable</p>
      <p className="text-xs">{fileName}</p>
    </div>
  );
}
