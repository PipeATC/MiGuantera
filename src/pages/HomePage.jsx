import { useNavigate } from 'react-router-dom';
import { Car, Bike, User, Users, ChevronRight, ScanLine, Settings2 } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import InstallBanner from '../components/layout/InstallBanner.jsx';
import HomeSuggestions from '../components/layout/HomeSuggestions.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

/**
 * Inicio: pantalla de acceso rápido. No muestra datos de documentos,
 * solo el listado de conductores y vehículos. Al tocar un vehículo se
 * entra directamente al Modo Inspección.
 */
export default function HomePage() {
  const { drivers, vehicles } = useApp();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-lg space-y-6 px-5 pb-28 pt-4">
      <InstallBanner />
      <HomeSuggestions />

      <header className="space-y-1">
        <h1 className="text-headline-md text-primary-900">Mi Guantera</h1>
        <p className="text-sm text-primary-500">
          Elige un vehículo para iniciar la inspección.
        </p>
      </header>

      {/* Conductores */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-primary-900">Conductores</h2>
          <span className="text-sm font-semibold text-primary-400">{drivers.length}</span>
        </div>

        {drivers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aún no hay conductores"
            description="Agrega conductores desde Gestión para exhibir su cédula y licencia."
            action={
              <button onClick={() => navigate('/gestion?tab=conductores')} className="btn-primary mt-1 !w-auto px-6">
                Ir a Gestión
              </button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {drivers.map((d) => (
              <button
                key={d.id}
                onClick={() => navigate(`/inspeccion?driver=${d.id}`)}
                className="flex w-full items-center gap-3 rounded-xl bg-white p-3.5 text-left shadow-card ring-1 ring-primary-100 transition active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <User className="h-6 w-6" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold text-primary-900">{d.name}</span>
                  <span className="tabular block truncate text-sm font-semibold text-primary-500">
                    {d.run || 'Sin RUN'}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-primary-300" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Vehículos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-primary-900">Vehículos</h2>
          <span className="text-sm font-semibold text-primary-400">{vehicles.length}</span>
        </div>

        {vehicles.length === 0 ? (
          <EmptyState
            icon={Car}
            title="Aún no tienes vehículos"
            description="Agrega tu primer vehículo desde Gestión para iniciar inspecciones."
            action={
              <button onClick={() => navigate('/gestion?tab=vehiculos')} className="btn-primary mt-1 !w-auto px-6">
                Ir a Gestión
              </button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {vehicles.map((v) => {
              const Icon = v.type === 'moto' ? Bike : Car;
              return (
                <button
                  key={v.id}
                  onClick={() => navigate(`/inspeccion?vehicle=${v.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl bg-white p-3.5 text-left shadow-card ring-1 ring-primary-100 transition active:scale-[0.99]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-900 text-white">
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold text-primary-900">{v.name}</span>
                    <span className="tabular block truncate text-sm font-semibold text-primary-500">
                      {v.plate || 'Sin patente'}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-brand-600">
                    <ScanLine className="h-4 w-4" /> Inspección
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Acceso a Gestión */}
      <button
        onClick={() => navigate('/gestion')}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary-100 font-bold text-primary-800 transition active:scale-[0.98]"
      >
        <Settings2 className="h-5 w-5" /> Gestionar vehículos y documentos
      </button>
    </div>
  );
}
