import { Car, Bike, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

/** Carrusel horizontal de vehículos + botón para agregar. */
export default function VehicleSelector({ onAdd }) {
  const { vehicles, activeVehicleId, setActiveVehicleId } = useApp();

  return (
    <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 no-scrollbar">
      {vehicles.map((v) => {
        const active = v.id === activeVehicleId;
        const Icon = v.type === 'moto' ? Bike : Car;
        return (
          <button
            key={v.id}
            onClick={() => setActiveVehicleId(v.id)}
            className={`flex min-w-[220px] shrink-0 items-center gap-3 rounded-xl px-4 py-3.5 text-left transition ${
              active
                ? 'bg-white shadow-card ring-2 ring-primary-900'
                : 'bg-white/70 shadow-card ring-1 ring-primary-100'
            }`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <Icon className="h-6 w-6" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold text-primary-900">
                {v.name}
              </span>
              <span className="tabular block text-sm font-semibold text-primary-500">
                {v.plate || 'Sin patente'}
              </span>
            </span>
          </button>
        );
      })}

      <button
        onClick={onAdd}
        className="flex min-w-[130px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-primary-200 px-4 py-3.5 text-primary-400 transition active:scale-[0.98]"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100">
          <Plus className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <span className="text-xs font-bold">Agregar</span>
      </button>
    </div>
  );
}
