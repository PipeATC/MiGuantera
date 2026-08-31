import { CheckCircle2, AlertTriangle, XCircle, Plus, Layers } from 'lucide-react';
import { useObjectUrl } from '../../hooks/useObjectUrl.js';
import { getExpiryStatus, formatDate } from '../../utils/dateUtils.js';
import { isImage } from '../../utils/fileUtils.js';

const CORNER = {
  vigente: { Icon: CheckCircle2, cls: 'bg-vigente text-white' },
  porvencer: { Icon: AlertTriangle, cls: 'bg-porvencer text-white' },
  vencido: { Icon: XCircle, cls: 'bg-vencido text-white' },
};

/** Miniatura del archivo o placeholder con el icono del tipo. */
function Thumb({ doc, type }) {
  const url = useObjectUrl(isImage(doc?.fileType) ? doc.fileBlob : null);
  const TypeIcon = type.icon;

  if (url) {
    return (
      <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-primary-100 text-primary-400">
      <TypeIcon className="h-8 w-8" strokeWidth={1.5} />
    </div>
  );
}

/**
 * Tarjeta de documento vehicular para la grilla de la Home.
 * Si no hay documento (`doc` null) muestra estado "Agregar".
 */
export default function DocumentCard({ type, doc, warnDays, onClick }) {
  const status = doc && type.hasExpiry ? getExpiryStatus(doc.expiryDate, warnDays) : null;
  const isVencido = status === 'vencido';
  const corner = status ? CORNER[status] : null;

  if (!doc) {
    return (
      <button
        onClick={onClick}
        className="flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-200 bg-white/60 p-4 text-primary-400 transition active:scale-[0.98]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
          <Plus className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <span className="text-label-caps uppercase">{type.label}</span>
        <span className="text-xs font-medium">Agregar</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`group flex flex-col overflow-hidden rounded-xl text-left shadow-card ring-1 transition active:scale-[0.98] ${
        isVencido ? 'bg-vencido-soft ring-vencido/30' : 'bg-white ring-primary-100'
      }`}
    >
      <div className="relative h-24 w-full overflow-hidden">
        <Thumb doc={doc} type={type} />
        {doc.backBlob && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary-900/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
            <Layers className="h-3 w-3" /> 2 caras
          </span>
        )}
        {corner && (
          <span
            className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full shadow ${corner.cls}`}
          >
            <corner.Icon className="h-4 w-4" strokeWidth={2.5} />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <p
          className={`text-label-caps uppercase ${
            isVencido ? 'text-vencido-dark' : 'text-primary-500'
          }`}
        >
          {type.label}
        </p>
        <p
          className={`text-base font-bold leading-tight ${
            isVencido ? 'text-vencido-dark' : 'text-primary-900'
          }`}
        >
          {type.subtitle}
        </p>
        <div className="mt-1">
          <p className="text-[11px] font-semibold uppercase text-primary-400">
            {type.hasExpiry ? 'Vence' : 'Emitido'}
          </p>
          <p
            className={`tabular text-sm font-bold ${
              isVencido ? 'text-vencido' : 'text-primary-700'
            }`}
          >
            {type.hasExpiry
              ? formatDate(doc.expiryDate)
              : doc.issueDate
                ? formatDate(doc.issueDate)
                : 'N/A'}
          </p>
        </div>
      </div>
    </button>
  );
}
