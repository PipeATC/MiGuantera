import { useEffect, useMemo, useState } from 'react';
import { FileText, Check, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { takeSharedFiles } from '../../utils/sharedFiles.js';
import { compressImage } from '../../utils/imageCompression.js';
import { isImage } from '../../utils/fileUtils.js';
import { useObjectUrl } from '../../hooks/useObjectUrl.js';
import {
  VEHICLE_DOC_TYPES,
  DRIVER_DOC_TYPES,
  getDocType,
} from '../../utils/docTypes.js';

/**
 * Importador del Share Target. Al abrir la app, recoge los archivos que el
 * usuario compartió desde otra app (foto o PDF) y ofrece guardarlos como un
 * documento, eligiendo tipo y a qué vehículo o conductor pertenece.
 */
export default function SharedImport() {
  const { saveDocument, vehicles, drivers } = useApp();
  const [files, setFiles] = useState([]);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('');
  const [targetId, setTargetId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Recoge los archivos compartidos una sola vez al montar.
  useEffect(() => {
    let alive = true;
    takeSharedFiles().then((f) => {
      if (alive && f.length) {
        setFiles(f);
        setOpen(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const first = files[0] || null;
  const previewUrl = useObjectUrl(first && isImage(first.fileType) ? first.blob : null);

  const meta = type ? getDocType(type) : null;
  const scope = meta?.scope;
  const targets = scope === 'driver' ? drivers : scope === 'vehicle' ? vehicles : [];
  const selectedDriver =
    scope === 'driver' ? drivers.find((d) => d.id === targetId) || null : null;

  // Reinicia el destino al cambiar de tipo de documento.
  useEffect(() => {
    setTargetId('');
  }, [type]);

  const canSave = useMemo(
    () => !!type && !!first && (!scope || targets.length === 0 || !!targetId),
    [type, first, scope, targets.length, targetId]
  );

  const close = () => {
    setOpen(false);
    setFiles([]);
    setType('');
    setTargetId('');
    setError('');
  };

  const handleSave = async () => {
    if (!type || !first) return;
    setSaving(true);
    setError('');
    try {
      const front = files[0];
      const back = files[1] || null;
      const frontBlob = isImage(front.fileType) ? await compressImage(front.blob) : front.blob;
      const backBlob =
        back && isImage(back.fileType) ? await compressImage(back.blob) : back?.blob || null;

      await saveDocument({
        type,
        vehicleId: scope === 'vehicle' ? targetId || null : null,
        driverId: scope === 'driver' ? targetId || null : null,
        fileBlob: frontBlob,
        fileName: front.fileName,
        fileType: frontBlob.type || front.fileType,
        fileSize: frontBlob.size,
        backBlob,
        backFileName: back?.fileName || '',
        backFileType: backBlob?.type || back?.fileType || '',
        backFileSize: backBlob?.size || 0,
        expiryDate: null,
        // En documentos del conductor el titular se deriva del conductor.
        number:
          scope === 'driver' && selectedDriver
            ? [selectedDriver.name, selectedDriver.run].filter(Boolean).join(' · ')
            : '',
      });
      close();
    } catch {
      setError('No se pudo guardar el documento. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !first) return null;

  const count = files.length;

  return (
    <Modal
      open={open}
      onClose={close}
      subtitle="Compartido"
      title={count > 1 ? `Guardar ${count} archivos` : 'Guardar documento'}
    >
      <div className="space-y-4">
        {/* Vista previa del archivo recibido */}
        <div className="flex items-center gap-3 rounded-lg bg-primary-50 px-3 py-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-100 text-primary-400">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <FileText className="h-6 w-6" strokeWidth={1.75} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-primary-900">{first.fileName}</p>
            <p className="text-xs text-primary-500">
              {count > 1 ? `${count} caras · se usará como anverso y reverso` : 'Anverso'}
            </p>
          </div>
        </div>

        {/* Tipo de documento */}
        <div>
          <label className="label-field" htmlFor="shared-type">
            Tipo de documento
          </label>
          <select
            id="shared-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input-well"
          >
            <option value="">Selecciona un tipo</option>
            <optgroup label="Vehículo">
              {VEHICLE_DOC_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Conductor">
              {DRIVER_DOC_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.title}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Destino (vehículo o conductor) */}
        {scope && (
          <div>
            <label className="label-field" htmlFor="shared-target">
              {scope === 'driver' ? 'Conductor' : 'Vehículo'}
            </label>
            {targets.length === 0 ? (
              <p className="rounded-lg bg-porvencer-soft px-4 py-2.5 text-sm font-medium text-porvencer-dark">
                No tienes {scope === 'driver' ? 'conductores' : 'vehículos'} aún. Se guardará sin
                asignar; podrás asociarlo luego en Gestión.
              </p>
            ) : (
              <select
                id="shared-target"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="input-well"
              >
                <option value="">Selecciona {scope === 'driver' ? 'un conductor' : 'un vehículo'}</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {scope === 'driver' ? (t.run ? `(${t.run})` : '') : t.plate ? `(${t.plate})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-vencido-soft px-4 py-2.5 text-sm font-medium text-vencido-dark">
            {error}
          </p>
        )}

        <div className="space-y-2 pt-1">
          <button onClick={handleSave} disabled={!canSave || saving} className="btn-primary disabled:opacity-60">
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Guardando…
              </>
            ) : (
              <>
                <Check className="h-5 w-5" /> Guardar documento
              </>
            )}
          </button>
          <button onClick={close} className="btn-secondary w-full">
            Descartar
          </button>
        </div>
      </div>
    </Modal>
  );
}
