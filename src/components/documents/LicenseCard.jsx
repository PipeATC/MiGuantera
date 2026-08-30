import { ScanLine, IdCard } from 'lucide-react';
import { useObjectUrl } from '../../hooks/useObjectUrl.js';
import StatusBadge from '../ui/StatusBadge.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { isImage } from '../../utils/fileUtils.js';

/**
 * Tarjeta destacada de la Licencia de Conducir en la Home.
 * onExhibit abre el Modo Control directamente en la pestaña licencia.
 */
export default function LicenseCard({ doc, driverName, warnDays, onExhibit, onEdit }) {
  const photoUrl = useObjectUrl(isImage(doc?.fileType) ? doc?.fileBlob : null);

  if (!doc) {
    return (
      <button
        onClick={onEdit}
        className="card-tactile flex w-full items-center gap-4 p-5 text-left transition active:scale-[0.99]"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-500">
          <IdCard className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <span>
          <span className="block text-label-caps uppercase text-primary-500">
            Licencia de Conducir
          </span>
          <span className="block text-lg font-bold text-primary-900">Agregar licencia</span>
          <span className="block text-sm text-primary-500">Toca para cargar tu documento</span>
        </span>
      </button>
    );
  }

  return (
    <div className="card-tactile overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-label-caps uppercase text-primary-500">Licencia de Conducir</p>
        <StatusBadge expiryDate={doc.expiryDate} warnDays={warnDays} size="md" />
      </div>

      <button onClick={onEdit} className="mt-1 block text-left">
        <h2 className="text-headline-md text-primary-900">
          {doc.number || driverName || 'Conductor'}
        </h2>
      </button>

      <div className="mt-4 flex items-center gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-primary-100 ring-1 ring-primary-200">
          {photoUrl ? (
            <img src={photoUrl} alt="Licencia" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary-400">
              <IdCard className="h-8 w-8" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <dl className="space-y-2">
          <div>
            <dt className="text-label-caps uppercase text-primary-400">Emisión</dt>
            <dd className="tabular text-base font-bold text-primary-800">
              {doc.issueDate ? formatDate(doc.issueDate) : 'N/A'}
            </dd>
          </div>
          <div>
            <dt className="text-label-caps uppercase text-primary-400">Vencimiento</dt>
            <dd className="tabular text-base font-bold text-primary-800">
              {formatDate(doc.expiryDate)}
            </dd>
          </div>
        </dl>
      </div>

      <button
        onClick={onExhibit}
        className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-primary-950 font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition active:scale-[0.98]"
      >
        <ScanLine className="h-5 w-5" /> Exhibir Licencia
      </button>
    </div>
  );
}
