import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Car, Bike, User, Plus, Pencil, Users, CarFront } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import Modal from '../components/ui/Modal.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import DocumentCard from '../components/documents/DocumentCard.jsx';
import DocumentForm from '../components/documents/DocumentForm.jsx';
import VehicleForm from '../components/vehicles/VehicleForm.jsx';
import DriverForm from '../components/drivers/DriverForm.jsx';
import { VEHICLE_DOC_TYPES, DRIVER_DOC_TYPES, getDocType } from '../utils/docTypes.js';

export default function ManagementPage() {
  const {
    vehicles,
    drivers,
    documentsByVehicle,
    documentsByDriver,
    warnDays,
  } = useApp();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'conductores' ? 'conductores' : 'vehiculos';
  const setTab = (t) => setParams({ tab: t }, { replace: true });

  const [vehicleModal, setVehicleModal] = useState(null); // { vehicle } | 'new'
  const [driverModal, setDriverModal] = useState(null); // { driver } | 'new'
  const [docModal, setDocModal] = useState(null); // { type, doc, vehicleId, driverId }

  const docByType = (list, key) => (list || []).find((d) => d.type === key) || null;

  return (
    <div className="mx-auto max-w-lg space-y-5 px-5 pb-28 pt-4">
      <div>
        <h1 className="text-headline-md text-primary-900">Gestión</h1>
        <p className="text-sm text-primary-500">
          Administra vehículos, conductores y sus documentos.
        </p>
      </div>

      {/* Segmentos */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-primary-100 p-1">
        {[
          { key: 'vehiculos', label: 'Vehículos', Icon: CarFront },
          { key: 'conductores', label: 'Conductores', Icon: Users },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition ${
              tab === key ? 'bg-white text-primary-900 shadow-card' : 'text-primary-500'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ------------------------------ VEHÍCULOS ------------------------------ */}
      {tab === 'vehiculos' && (
        <div className="space-y-4">
          <button
            onClick={() => setVehicleModal('new')}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary-900 font-bold text-white shadow-card transition active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" /> Agregar vehículo
          </button>

          {vehicles.length === 0 ? (
            <EmptyState
              icon={Car}
              title="Sin vehículos"
              description="Agrega un vehículo para gestionar sus documentos."
            />
          ) : (
            vehicles.map((v) => {
              const Icon = v.type === 'moto' ? Bike : Car;
              const docs = documentsByVehicle.get(v.id);
              return (
                <section key={v.id} className="card-tactile p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-900 text-white">
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-primary-900">{v.name}</p>
                      <p className="tabular truncate text-sm text-primary-500">
                        {v.plate || 'Sin patente'}
                        {v.brand ? ` · ${v.brand}` : ''}
                        {v.model ? ` ${v.model}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setVehicleModal({ vehicle: v })}
                      className="flex items-center gap-1 rounded-lg bg-primary-100 px-3 py-2 text-sm font-semibold text-primary-700 active:scale-95"
                    >
                      <Pencil className="h-4 w-4" /> Editar
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {VEHICLE_DOC_TYPES.map((type) => (
                      <DocumentCard
                        key={type.key}
                        type={type}
                        doc={docByType(docs, type.key)}
                        warnDays={warnDays}
                        onClick={() =>
                          setDocModal({
                            type: type.key,
                            doc: docByType(docs, type.key),
                            vehicleId: v.id,
                          })
                        }
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}

      {/* ----------------------------- CONDUCTORES ----------------------------- */}
      {tab === 'conductores' && (
        <div className="space-y-4">
          <button
            onClick={() => setDriverModal('new')}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary-900 font-bold text-white shadow-card transition active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" /> Agregar conductor
          </button>

          {drivers.length === 0 ? (
            <EmptyState
              icon={User}
              title="Sin conductores"
              description="Agrega un conductor para gestionar su cédula y licencia."
            />
          ) : (
            drivers.map((d) => {
              const docs = documentsByDriver.get(d.id);
              return (
                <section key={d.id} className="card-tactile p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                      <User className="h-6 w-6" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-primary-900">{d.name}</p>
                      <p className="tabular truncate text-sm text-primary-500">
                        {d.run || 'Sin RUN'}
                        {d.phone ? ` · ${d.phone}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setDriverModal({ driver: d })}
                      className="flex items-center gap-1 rounded-lg bg-primary-100 px-3 py-2 text-sm font-semibold text-primary-700 active:scale-95"
                    >
                      <Pencil className="h-4 w-4" /> Editar
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {DRIVER_DOC_TYPES.map((type) => (
                      <DocumentCard
                        key={type.key}
                        type={type}
                        doc={docByType(docs, type.key)}
                        warnDays={warnDays}
                        onClick={() =>
                          setDocModal({
                            type: type.key,
                            doc: docByType(docs, type.key),
                            driverId: d.id,
                          })
                        }
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}

      {/* Modal vehículo */}
      <Modal
        open={!!vehicleModal}
        onClose={() => setVehicleModal(null)}
        subtitle={vehicleModal?.vehicle ? 'Editar' : 'Nuevo'}
        title={vehicleModal?.vehicle ? 'Editar vehículo' : 'Agregar vehículo'}
      >
        {vehicleModal && (
          <VehicleForm
            vehicle={vehicleModal === 'new' ? null : vehicleModal.vehicle}
            onDone={() => setVehicleModal(null)}
          />
        )}
      </Modal>

      {/* Modal conductor */}
      <Modal
        open={!!driverModal}
        onClose={() => setDriverModal(null)}
        subtitle={driverModal?.driver ? 'Editar' : 'Nuevo'}
        title={driverModal?.driver ? 'Editar conductor' : 'Agregar conductor'}
      >
        {driverModal && (
          <DriverForm
            driver={driverModal === 'new' ? null : driverModal.driver}
            onDone={() => setDriverModal(null)}
          />
        )}
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
            vehicleId={docModal.vehicleId}
            driverId={docModal.driverId}
            onDone={() => setDocModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}
