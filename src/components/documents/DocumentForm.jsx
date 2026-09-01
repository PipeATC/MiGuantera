import { useState } from 'react';
import { Cloud, RefreshCw, Download, Trash2, Save, Layers } from 'lucide-react';
import DocumentSideField from './DocumentSideField.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { getDocType } from '../../utils/docTypes.js';
import { formatBytes, downloadBlob } from '../../utils/fileUtils.js';

/**
 * Formulario de creación/edición de un documento (contenido del modal).
 * Cada documento admite dos caras: anverso (frontal) y reverso (posterior).
 * type: clave del tipo de documento. doc: registro existente o null.
 * vehicleId: vehículo asociado por defecto.
 */
export default function DocumentForm({ type, doc, vehicleId, driverId, onDone }) {
  const { vehicles, drivers, saveDocument, removeDocument } = useApp();
  const meta = getDocType(type);

  // Estado por cara: pending = nuevo archivo elegido; removed = quitar el existente.
  const [frontPending, setFrontPending] = useState(null);
  const [frontRemoved, setFrontRemoved] = useState(false);
  const [backPending, setBackPending] = useState(null);
  const [backRemoved, setBackRemoved] = useState(false);

  const [expiryDate, setExpiryDate] = useState(doc?.expiryDate || '');
  const [issueDate, setIssueDate] = useState(doc?.issueDate || '');
  const [number, setNumber] = useState(doc?.number || '');
  const [assignedVehicle, setAssignedVehicle] = useState(
    doc?.vehicleId || (meta.scope === 'vehicle' ? vehicleId || '' : '')
  );
  const [assignedDriver, setAssignedDriver] = useState(
    doc?.driverId || (meta.scope === 'driver' ? driverId || '' : '')
  );
  const [saving, setSaving] = useState(false);

  // Archivo efectivo por cara (nuevo, existente o ninguno).
  const front = frontRemoved
    ? null
    : frontPending || (doc?.fileBlob
        ? { blob: doc.fileBlob, fileName: doc.fileName, fileType: doc.fileType, fileSize: doc.fileSize }
        : null);
  const back = backRemoved
    ? null
    : backPending || (doc?.backBlob
        ? { blob: doc.backBlob, fileName: doc.backFileName, fileType: doc.backFileType, fileSize: doc.backFileSize }
        : null);

  const totalSize = (front?.fileSize || 0) + (back?.fileSize || 0);
  const sidesCount = (front ? 1 : 0) + (back ? 1 : 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDocument({
        id: doc?.id,
        type,
        vehicleId: meta.scope === 'vehicle' ? assignedVehicle || null : null,
        driverId: meta.scope === 'driver' ? assignedDriver || null : null,
        fileBlob: front?.blob || null,
        fileName: front?.fileName || '',
        fileType: front?.fileType || '',
        fileSize: front?.fileSize || 0,
        backBlob: back?.blob || null,
        backFileName: back?.fileName || '',
        backFileType: back?.fileType || '',
        backFileSize: back?.fileSize || 0,
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
    if (front?.blob) downloadBlob(front.blob, front.fileName || `${type}-anverso`);
    if (back?.blob) downloadBlob(back.blob, back.fileName || `${type}-reverso`);
  };

  return (
    <div className="space-y-5">
      {/* Caras del documento */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DocumentSideField
          label="Anverso"
          blob={front?.blob}
          fileName={front?.fileName}
          fileType={front?.fileType}
          fileSize={front?.fileSize}
          onPick={(f) => {
            setFrontPending(f);
            setFrontRemoved(false);
          }}
          onRemove={() => {
            setFrontPending(null);
            setFrontRemoved(true);
          }}
        />
        <DocumentSideField
          label="Reverso"
          blob={back?.blob}
          fileName={back?.fileName}
          fileType={back?.fileType}
          fileSize={back?.fileSize}
          onPick={(f) => {
            setBackPending(f);
            setBackRemoved(false);
          }}
          onRemove={() => {
            setBackPending(null);
            setBackRemoved(true);
          }}
        />
      </div>
      <p className="flex items-center gap-1.5 text-xs text-primary-500">
        <Layers className="h-3.5 w-3.5" /> Agrega ambas caras para exhibirlas con un deslizamiento.
      </p>

      {/* Estado de guardado local */}
      {sidesCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-vigente-soft px-4 py-3 text-vigente-dark">
          <Cloud className="h-6 w-6 shrink-0" strokeWidth={2} />
          <div className="min-w-0">
            <p className="font-bold leading-tight">Guardado localmente</p>
            <p className="truncate text-sm">
              {sidesCount === 2 ? 'Anverso y reverso · ' : '1 cara · '}
              {totalSize ? `${formatBytes(totalSize)} · ` : ''}Disponible sin conexión
            </p>
          </div>
        </div>
      )}

      {/* Nº de documento */}
      <div>
        <label className="label-field" htmlFor="doc-number">
          {type === 'licencia' || type === 'cedula'
            ? 'Nombre / RUN del titular'
            : 'Número de documento'}
        </label>
        <input
          id="doc-number"
          type="text"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder={
            type === 'licencia' || type === 'cedula' ? 'Ej: Ana María Rodríguez' : 'Opcional'
          }
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

      {/* Conductor asociado */}
      {meta.scope === 'driver' && (
        <div>
          <label className="label-field" htmlFor="doc-driver">
            Conductor
          </label>
          <select
            id="doc-driver"
            value={assignedDriver}
            onChange={(e) => setAssignedDriver(e.target.value)}
            className="input-well"
          >
            <option value="">Sin asignar</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.run ? `(${d.run})` : ''}
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
            <button
              onClick={handleDownload}
              disabled={sidesCount === 0}
              className="btn-secondary disabled:opacity-50"
            >
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
