import { useState } from 'react';
import { FileUp, FolderOpen, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import Modal from '../components/ui/Modal.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import DocumentForm from '../components/documents/DocumentForm.jsx';
import { DOC_TYPE_LIST, getDocType } from '../utils/docTypes.js';
import { formatDateShort, daysLabel } from '../utils/dateUtils.js';
import { formatBytes } from '../utils/fileUtils.js';

function DocRow({ doc, vehicle, onClick }) {
  const type = getDocType(doc.type);
  const Icon = type.icon;
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl bg-white p-3.5 text-left shadow-card ring-1 ring-primary-100 transition active:scale-[0.99]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-primary-900">{type.title}</p>
        <p className="truncate text-sm text-primary-500">
          {vehicle ? `${vehicle.name}` : type.scope === 'driver' ? 'Conductor' : 'Sin asignar'}
          {doc.expiryDate ? ` · ${daysLabel(doc.expiryDate)}` : ''}
          {doc.fileSize ? ` · ${formatBytes(doc.fileSize)}` : ''}
        </p>
      </div>
      {type.hasExpiry && doc.expiryDate ? (
        <StatusBadge expiryDate={doc.expiryDate} size="sm" showIcon={false} />
      ) : null}
      <ChevronRight className="h-5 w-5 shrink-0 text-primary-300" />
    </button>
  );
}

export default function ManagementPage() {
  const { documents, vehicles, activeVehicleId } = useApp();
  const [docModal, setDocModal] = useState(null); // { type, doc }
  const [picker, setPicker] = useState(false);

  const vehById = new Map(vehicles.map((v) => [v.id, v]));
  const sorted = [...documents].sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));

  return (
    <div className="mx-auto max-w-lg space-y-5 px-5 pb-28 pt-4">
      <div>
        <h1 className="text-headline-md text-primary-900">Gestión de Documentos</h1>
        <p className="text-sm text-primary-500">Sube, actualiza y organiza tus archivos.</p>
      </div>

      <button
        onClick={() => setPicker(true)}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary-900 font-bold text-white shadow-card transition active:scale-[0.98]"
      >
        <FileUp className="h-5 w-5" /> Subir nuevo documento
      </button>

      {sorted.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Sin documentos aún"
          description="Sube tu primer documento para tenerlo disponible sin conexión."
        />
      ) : (
        <div className="space-y-2.5">
          {sorted.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              vehicle={doc.vehicleId ? vehById.get(doc.vehicleId) : null}
              onClick={() => setDocModal({ type: doc.type, doc })}
            />
          ))}
        </div>
      )}

      {/* Selector de tipo de documento nuevo */}
      <Modal
        open={picker}
        onClose={() => setPicker(false)}
        subtitle="Nuevo documento"
        title="¿Qué vas a subir?"
      >
        <div className="grid grid-cols-2 gap-3">
          {DOC_TYPE_LIST.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.key}
                onClick={() => {
                  setPicker(false);
                  setDocModal({ type: type.key, doc: null });
                }}
                className="flex flex-col items-start gap-2 rounded-xl bg-white p-4 text-left shadow-card ring-1 ring-primary-100 transition active:scale-[0.98]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-bold text-primary-900">{type.title}</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-brand-600">
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </span>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Editor de documento */}
      <Modal
        open={!!docModal}
        onClose={() => setDocModal(null)}
        subtitle={docModal?.doc ? 'Actualizar documento' : 'Nuevo documento'}
        title={docModal ? getDocType(docModal.type)?.title : ''}
      >
        {docModal && (
          <DocumentForm
            type={docModal.type}
            doc={docModal.doc}
            vehicleId={activeVehicleId}
            onDone={() => setDocModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}
