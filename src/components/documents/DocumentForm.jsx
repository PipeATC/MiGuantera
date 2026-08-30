import { useState } from 'react';
import { Cloud, RefreshCw, Download, Trash2, Save } from 'lucide-react';
import DocumentUpload from './DocumentUpload.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { getDocType } from '../../utils/docTypes.js';
import { formatBytes, downloadBlob } from '../../utils/fileUtils.js';

/**
 * Formulario de creación/edición de un documento (contenido del modal).
 * type: clave del tipo de documento. doc: registro existente o null.
 * vehicleId: vehículo asociado por defecto.
 */
export default function DocumentForm({ type, doc, vehicleId, onDone }) {
  const { vehicles, saveDocument, removeDocument } = useApp();
  const meta = getDocType(type);

  const [pending, setPending] = useState(null); // { blob, fileName, fileType, fileSize }
  const [expiryDate, setExpiryDate] = useState(doc?.expiryDate || '');
  const [issueDate, setIssueDate] = useState(doc?.issueDate || '');
  const [number, setNumber] = useState(doc?.number || '');
  const [assignedVehicle, setAssignedVehicle] = useState(
    doc?.vehicleId || (meta.scope === 'vehicle' ? vehicleId || '' : '')
  );
  const [saving, setSaving] = useState(false);

  const hasFile = pending || doc?.fileBlob;
  const fileName = pending?.fileName || doc?.fileName;
  const fileSize = pending?.fileSize ?? doc?.fileSize;
  const fileType = pending?.fileType || doc?.fileType;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDocument({
        id: doc?.id,
        type,
        vehicleId: meta.scope === 'vehicle' ? assignedVehicle || null : null,
        fileBlob: pending ? pending.blob : doc?.fileBlob || null,
        fileName: pending ? pending.fileName : doc?.fileName || '',
        fileType: pending ? pending.fileType : doc?.fileType || '',
        fileSize: pending ? pending.fileSize : doc?.fileSize || 0,
        issueDate: issueDate || null,
        expiryDate: meta.hasExpiry ? expiryDate || null : null,
        number,
        createdAt: doc?.createdAt,
      });
      onDone?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!doc) return;
    if (!confirm('¿Eliminar este documento? Esta acción no se puede deshacer.')) return;
    await removeDocument(doc.id);
    onDone?.();
  };

  const handleDownload = () => {
    const blob = pending?.blob || doc?.fileBlob;
    if (blob) downloadBlob(blob, fileName || `${type}`);
  };

  return (
    <div className="space-y-5">
      <DocumentUpload onFile={setPending} currentName={pending ? pending.fileName : null} />

      {/* Estado de guardado local */}
      {hasFile && (
        <div className="flex items-center gap-3 rounded-lg bg-vigente-soft px-4 py-3 text-vigente-dark">
          <Cloud className="h-6 w-6 shrink-0" strokeWidth={2} />
          <div className="min-w-0">
            <p className="font-bold leading-tight">Guardado localmente</p>
            <p className="truncate text-sm">
              {fileSize ? `${formatBytes(fileSize)} · ` : ''}Disponible sin conexión
            </p>
          </div>
        </div>
      )}

      {/* Nº de documento */}
      <div>
        <label className="label-field" htmlFor="doc-number">
          {type === 'licencia' ? 'Nombre / RUN del conductor' : 'Número de documento'}
        </label>
        <input
          id="doc-number"
          type="text"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder={type === 'licencia' ? 'Ej: Ana María Rodríguez' : 'Opcional'}
          className="input-well"
        />
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {meta.hasExpiry && (
          <div>
            <label className="label-field" htmlFor="doc-expiry">
              Fecha de Vencimiento
            </label>
            <input
              id="doc-expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="input-well tabular"
            />
          </div>
        )}
        <div>
          <label className="label-field" htmlFor="doc-issue">
            Fecha de Emisión
          </label>
          <input
            id="doc-issue"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="input-well tabular"
          />
        </div>
      </div>

      {/* Vehículo asociado */}
      {meta.scope === 'vehicle' && (
        <div>
          <label className="label-field" htmlFor="doc-vehicle">
            Vehículo Asociado
          </label>
          <select
            id="doc-vehicle"
            value={assignedVehicle}
            onChange={(e) => setAssignedVehicle(e.target.value)}
            className="input-well"
          >
            <option value="">Sin asignar</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} {v.plate ? `(${v.plate})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Acciones */}
      <div className="space-y-2 pt-1">
        <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
          {doc ? (
            <>
              <RefreshCw className="h-5 w-5" /> Guardar cambios
            </>
          ) : (
            <>
              <Save className="h-5 w-5" /> Guardar documento
            </>
          )}
        </button>

        {doc && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleDownload} disabled={!hasFile} className="btn-secondary disabled:opacity-50">
              <Download className="h-5 w-5" /> Descargar
            </button>
            <button onClick={handleDelete} className="btn-danger">
              <Trash2 className="h-5 w-5" /> Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
