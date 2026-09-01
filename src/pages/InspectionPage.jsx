import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  Sun,
  Plus,
  Minus,
  Maximize2,
  ChevronDown,
  Check,
  User,
  Car,
  Bike,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldQuestion,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useWakeLock } from '../hooks/useWakeLock.js';
import SwipeViewer from '../components/ui/SwipeViewer.jsx';
import FullscreenDoc from '../components/ui/FullscreenDoc.jsx';
import {
  INSPECTION_TABS,
  DRIVER_INSPECTION_TABS,
  getDocType,
} from '../utils/docTypes.js';
import { getExpiryStatus, formatDateShort, daysLabel } from '../utils/dateUtils.js';

const STATUS_UI = {
  vigente: { label: 'Vigente', Icon: CheckCircle2, ring: 'bg-emerald-500', text: 'text-emerald-400', panel: 'bg-emerald-950/60 ring-emerald-500/30' },
  porvencer: { label: 'Por Vencer', Icon: AlertTriangle, ring: 'bg-amber-500', text: 'text-amber-400', panel: 'bg-amber-950/50 ring-amber-500/30' },
  vencido: { label: 'Vencido', Icon: XCircle, ring: 'bg-red-500', text: 'text-red-400', panel: 'bg-red-950/50 ring-red-500/30' },
  'sin-fecha': { label: 'Sin fecha', Icon: ShieldQuestion, ring: 'bg-slate-500', text: 'text-slate-300', panel: 'bg-slate-800/60 ring-slate-500/30' },
};

const isDriverTab = (t) => DRIVER_INSPECTION_TABS.includes(t);

/** Hoja inferior de selección (vehículo / conductor) sobre fondo oscuro. */
function PickerSheet({ open, title, items, activeId, onSelect, onClose, renderItem }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 max-h-[70vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-primary-900 p-4 pb-safe text-white shadow-card no-scrollbar">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" />
        <h3 className="mb-3 px-1 text-sm font-bold uppercase tracking-widest text-white/60">{title}</h3>
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-white/50">No hay registros.</p>
          ) : (
            items.map((it) => {
              const active = it.id === activeId;
              return (
                <button
                  key={it.id}
                  onClick={() => {
                    onSelect(it.id);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition ${
                    active ? 'bg-emerald-600' : 'bg-white/5 active:bg-white/10'
                  }`}
                >
                  <span className="min-w-0 flex-1">{renderItem(it)}</span>
                  {active && <Check className="h-5 w-5 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Modo Control Policial: renderizador full-screen de alto contraste.
 * - Mantiene la pantalla encendida (Wake Lock).
 * - Toca la patente para cambiar de vehículo; toca el conductor para cambiarlo.
 * - Barra inferior fija para cambiar de documento con un toque.
 * - Botón para ver el documento a pantalla completa.
 */
export default function InspectionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    documents,
    vehicles,
    drivers,
    activeVehicle,
    activeVehicleId,
    setActiveVehicleId,
    activeDriver,
    activeDriverId,
    setActiveDriverId,
    warnDays,
  } = useApp();
  const { supported: wakeSupported, isLocked } = useWakeLock(true);

  // Sincroniza el vehículo / conductor indicado en la URL con el contexto.
  useEffect(() => {
    const v = params.get('vehicle');
    if (v && vehicles.some((x) => x.id === v)) setActiveVehicleId(v);
    const d = params.get('driver');
    if (d && drivers.some((x) => x.id === d)) setActiveDriverId(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, drivers]);

  const [tab, setTab] = useState(() => {
    const t = params.get('tab');
    if (INSPECTION_TABS.includes(t)) return t;
    return params.get('vehicle') ? 'padron' : INSPECTION_TABS[0];
  });
  const [zoom, setZoom] = useState(1);
  const [bright, setBright] = useState(false);
  const [vehiclePicker, setVehiclePicker] = useState(false);
  const [driverPicker, setDriverPicker] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Reinicia el zoom al cambiar de pestaña
  useEffect(() => setZoom(1), [tab]);

  const plate = activeVehicle?.plate || '—';
  const driverLabel = activeDriver?.name || 'Sin conductor';

  // Documento para la pestaña activa (según sea del conductor o del vehículo).
  const doc = useMemo(() => {
    if (isDriverTab(tab)) {
      return documents.find((d) => d.type === tab && d.driverId === activeDriverId) || null;
    }
    return documents.find((d) => d.type === tab && d.vehicleId === activeVehicleId) || null;
  }, [documents, tab, activeVehicleId, activeDriverId]);

  const meta = getDocType(tab);
  const status = doc && meta?.hasExpiry ? getExpiryStatus(doc.expiryDate, warnDays) : 'sin-fecha';
  const ui = STATUS_UI[status];

  // Caras del documento (anverso / reverso) para el visor con swipe.
  const sides = useMemo(
    () =>
      [
        { blob: doc?.fileBlob, fileType: doc?.fileType, fileName: doc?.fileName, label: 'Anverso' },
        { blob: doc?.backBlob, fileType: doc?.backFileType, fileName: doc?.backFileName, label: 'Reverso' },
      ].filter((s) => s.blob),
    [doc]
  );
  const hasImage = sides.some((s) => s.fileType?.startsWith('image/'));

  // Punto de alerta en las pestañas con documento vencido/por vencer
  const tabAlert = (t) => {
    const dt = getDocType(t);
    if (!dt?.hasExpiry) return null;
    const d = isDriverTab(t)
      ? documents.find((x) => x.type === t && x.driverId === activeDriverId)
      : documents.find((x) => x.type === t && x.vehicleId === activeVehicleId);
    if (!d) return null;
    const s = getExpiryStatus(d.expiryDate, warnDays);
    if (s === 'vencido') return 'bg-red-500';
    if (s === 'porvencer') return 'bg-amber-400';
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-primary-950 text-white">
      {/* Header */}
      <div className="pt-safe">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/')}
            aria-label="Volver"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:scale-95"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-extrabold">Modo Inspección</h1>
        </div>

        {/* Franja institucional */}
        <div className="flex items-center justify-between bg-emerald-700 px-5 py-2.5">
          <div className="flex items-center gap-2">
            <ShieldQuestion className="h-5 w-5" strokeWidth={2.25} />
            <span className="text-sm font-bold uppercase tracking-widest">
              Modo Control Policial
            </span>
          </div>
          <button
            onClick={() => setBright((b) => !b)}
            aria-label="Brillo máximo"
            className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
              bright ? 'bg-white text-emerald-700' : 'text-white/90'
            }`}
          >
            <Sun className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Selectores: Patente (cambiar vehículo) y Conductor */}
      <div className="flex items-stretch gap-3 px-4 py-3">
        <button
          onClick={() => setVehiclePicker(true)}
          className="flex flex-1 flex-col items-start gap-0.5 rounded-lg bg-white/5 px-4 py-2.5 text-left ring-1 ring-white/10 active:scale-[0.98]"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Patente · cambiar
          </span>
          <span className="tabular flex items-center gap-2 text-xl font-extrabold tracking-widest">
            {plate}
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </span>
        </button>
        <button
          onClick={() => setDriverPicker(true)}
          className="flex flex-1 flex-col items-start gap-0.5 rounded-lg bg-white/5 px-4 py-2.5 text-left ring-1 ring-white/10 active:scale-[0.98]"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Conductor · cambiar
          </span>
          <span className="flex items-center gap-2 truncate text-base font-bold">
            <User className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{driverLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </span>
        </button>
      </div>

      {/* Visor del documento */}
      <div className="relative min-h-0 flex-1 px-4">
        <div
          className={`relative h-full overflow-hidden rounded-xl ring-1 ring-white/10 ${
            bright ? 'bg-white' : 'bg-slate-100'
          }`}
        >
          {sides.length > 0 ? (
            <SwipeViewer
              sides={sides}
              zoom={zoom}
              swipeEnabled={zoom === 1}
              onIndexChange={() => setZoom(1)}
              className="p-1"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-500">
              {meta?.icon ? <meta.icon className="h-12 w-12" strokeWidth={1.5} /> : <Car className="h-12 w-12" />}
              <p className="font-semibold">Sin documento cargado</p>
              <p className="text-sm">Agrega {meta?.title} desde Gestión</p>
            </div>
          )}

          {/* Controles: pantalla completa + zoom */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            {sides.length > 0 && (
              <button
                onClick={() => setFullscreen(true)}
                aria-label="Ver a pantalla completa"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg active:scale-95"
              >
                <Maximize2 className="h-6 w-6" />
              </button>
            )}
            {hasImage && (
              <>
                <button
                  onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                  aria-label="Acercar"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg active:scale-95"
                >
                  <Plus className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
                  aria-label="Alejar"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg active:scale-95"
                >
                  <Minus className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Panel de estado */}
      <div className="px-4 py-4">
        <div className={`flex items-center gap-4 rounded-xl px-5 py-4 ring-1 ${ui.panel}`}>
          <span className={`flex h-12 w-12 items-center justify-center rounded-full ${ui.ring} text-white`}>
            <ui.Icon className="h-7 w-7" strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Estado</p>
            <p className={`text-xl font-extrabold uppercase ${ui.text}`}>{ui.label}</p>
            {doc && meta?.hasExpiry && (
              <p className="text-sm text-slate-300">
                Vence: {formatDateShort(doc.expiryDate)} · {daysLabel(doc.expiryDate)}
              </p>
            )}
          </div>
        </div>
        {wakeSupported && (
          <p className="mt-2 text-center text-xs text-slate-500">
            {isLocked ? '🔆 Pantalla activa durante la inspección' : 'Manteniendo pantalla encendida…'}
          </p>
        )}
      </div>

      {/* Barra inferior de pestañas */}
      <nav className="grid grid-cols-4 gap-1 border-t border-white/10 bg-primary-950 px-1 pb-safe pt-2">
        {INSPECTION_TABS.map((t) => {
          const dt = getDocType(t);
          const active = t === tab;
          const alert = tabAlert(t);
          const Icon = dt.icon;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative flex flex-col items-center gap-1 rounded-lg py-2.5 text-xs font-bold transition ${
                active ? 'bg-emerald-600 text-white' : 'text-slate-400'
              }`}
            >
              {alert && (
                <span
                  className={`absolute right-3 top-2 h-2.5 w-2.5 rounded-full ${alert} ring-2 ring-primary-950`}
                />
              )}
              <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
              {dt.label}
            </button>
          );
        })}
      </nav>

      {/* Selector de vehículo */}
      <PickerSheet
        open={vehiclePicker}
        title="Cambiar vehículo"
        items={vehicles}
        activeId={activeVehicleId}
        onSelect={setActiveVehicleId}
        onClose={() => setVehiclePicker(false)}
        renderItem={(v) => (
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              {v.type === 'moto' ? <Bike className="h-5 w-5" /> : <Car className="h-5 w-5" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-bold">{v.name}</span>
              <span className="tabular block text-sm text-white/60">{v.plate || 'Sin patente'}</span>
            </span>
          </span>
        )}
      />

      {/* Selector de conductor */}
      <PickerSheet
        open={driverPicker}
        title="Cambiar conductor"
        items={drivers}
        activeId={activeDriverId}
        onSelect={setActiveDriverId}
        onClose={() => setDriverPicker(false)}
        renderItem={(d) => (
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <User className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-bold">{d.name}</span>
              <span className="tabular block text-sm text-white/60">{d.run || 'Sin RUN'}</span>
            </span>
          </span>
        )}
      />

      {/* Visor a pantalla completa */}
      {fullscreen && (
        <FullscreenDoc
          sides={sides}
          title={meta?.title || ''}
          onClose={() => setFullscreen(false)}
        />
      )}
    </div>
  );
}
