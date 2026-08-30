import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Car } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import InstallBanner from '../components/layout/InstallBanner.jsx';
import VehicleSelector from '../components/vehicles/VehicleSelector.jsx';
import VehicleForm from '../components/vehicles/VehicleForm.jsx';
import DocumentCard from '../components/documents/DocumentCard.jsx';
import DocumentForm from '../components/documents/DocumentForm.jsx';
import LicenseCard from '../components/documents/LicenseCard.jsx';
import ReminderBanner from '../components/documents/ReminderBanner.jsx';
import Modal from '../components/ui/Modal.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { VEHICLE_DOC_TYPES, getDocType } from '../utils/docTypes.js';

export default function HomePage() {
  const {
    vehicles,
    documents,
    documentsByVehicle,
    activeVehicle,
    activeVehicleId,
    driverName,
    warnDays,
  } = useApp();
  const navigate = useNavigate();

  const [vehicleModal, setVehicleModal] = useState(false);
  const [docModal, setDocModal] = useState(null); // { type, doc }

  const licenseDoc = documents.find((d) => d.type === 'licencia') || null;
  const vehicleDocs = documentsByVehicle.get(activeVehicleId) || [];
  const docByType = (t) => vehicleDocs.find((d) => d.type === t) || null;

  const openDoc = (type, doc) => setDocModal({ type, doc });

  return (
    <div className="mx-auto max-w-lg space-y-6 px-5 pb-28 pt-4">
      <InstallBanner />
      <ReminderBanner onClick={() => navigate('/gestion')} />

      {/* Licencia de conducir */}
      <LicenseCard
        doc={licenseDoc}
        driverName={driverName}
        warnDays={warnDays}
        onExhibit={() => navigate('/inspeccion?tab=licencia')}
        onEdit={() => openDoc('licencia', licenseDoc)}
      />

      {/* Botón directo Modo Inspección */}
      <button
        onClick={() => navigate('/inspeccion')}
        className="flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-xl bg-brand-500 font-bold text-white shadow-fab transition active:scale-[0.98]"
      >
        <ShieldCheck className="h-6 w-6" strokeWidth={2.25} /> Modo Inspección
      </button>

      {/* Vehículos */}
      <section className="space-y-3">
        <h2 className="text-headline-sm text-primary-900">Vehículos</h2>
        {vehicles.length === 0 ? (
          <EmptyState
            icon={Car}
            title="Aún no tienes vehículos"
            description="Agrega tu primer vehículo para empezar a guardar sus documentos."
            action={
              <button onClick={() => setVehicleModal(true)} className="btn-primary mt-1 !w-auto px-6">
                Agregar vehículo
              </button>
            }
          />
        ) : (
          <VehicleSelector onAdd={() => setVehicleModal(true)} />
        )}
      </section>

      {/* Documentos del vehículo activo */}
      {activeVehicle && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-sm text-primary-900">Documentos</h2>
            <button
              onClick={() => setVehicleModal('edit')}
              className="text-sm font-semibold text-primary-500"
            >
              Editar vehículo
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {VEHICLE_DOC_TYPES.map((type) => (
              <DocumentCard
                key={type.key}
                type={type}
                doc={docByType(type.key)}
                warnDays={warnDays}
                onClick={() => openDoc(type.key, docByType(type.key))}
              />
            ))}
          </div>
        </section>
      )}

      {/* Modal documento */}
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

      {/* Modal vehículo */}
      <Modal
        open={!!vehicleModal}
        onClose={() => setVehicleModal(false)}
        subtitle={vehicleModal === 'edit' ? 'Editar' : 'Nuevo'}
        title={vehicleModal === 'edit' ? 'Editar vehículo' : 'Agregar vehículo'}
      >
        <VehicleForm
          vehicle={vehicleModal === 'edit' ? activeVehicle : null}
          onDone={() => setVehicleModal(false)}
        />
      </Modal>
    </div>
  );
}
