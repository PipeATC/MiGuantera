import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  Sun,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldQuestion,
  Car,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useWakeLock } from '../hooks/useWakeLock.js';
import FileViewer from '../components/ui/FileViewer.jsx';
import { INSPECTION_TABS, getDocType } from '../utils/docTypes.js';
import { getExpiryStatus, formatDateShort, daysLabel } from '../utils/dateUtils.js';

const STATUS_UI = {
  vigente: { label: 'Vigente', Icon: CheckCircle2, ring: 'bg-emerald-500', text: 'text-emerald-400', panel: 'bg-emerald-950/60 ring-emerald-500/30' },
  porvencer: { label: 'Por Vencer', Icon: AlertTriangle, ring: 'bg-amber-500', text: 'text-amber-400', panel: 'bg-amber-950/50 ring-amber-500/30' },
  vencido: { label: 'Vencido', Icon: XCircle, ring: 'bg-red-500', text: 'text-red-400', panel: 'bg-red-950/50 ring-red-500/30' },
  'sin-fecha': { label: 'Sin fecha', Icon: ShieldQuestion, ring: 'bg-slate-500', text: 'text-slate-300', panel: 'bg-slate-800/60 ring-slate-500/30' },
};

/**
 * Modo Control Policial: renderizador full-screen de alto contraste.
 * - Mantiene la pantalla encendida (Wake Lock).
 * - Barra inferior fija para cambiar de documento con un toque.
 * - Zoom de imágenes con botones grandes.
 */
export default function InspectionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { documents, activeVehicle, vehicles, warnDays } = useApp();
  const { supported: wakeSupported, isLocked } = useWakeLock(true);

  const [tab, setTab] = useState(() => {
    const t = params.get('tab');
    return INSPECTION_TABS.includes(t) ? t : 'licencia';
  });
  const [zoom, setZoom] = useState(1);
  const [bright, setBright] = useState(false);

  // Reinicia el zoom al cambiar de pestaña
  useEffect(() => setZoom(1), [tab]);

  const plate = activeVehicle?.plate || (vehicles[0] && vehicles[0].plate) || '—';
  const vehicleId = activeVehicle?.id || (vehicles[0] && vehicles[0].id) || null;

  // Documento para la pestaña activa
  const doc = useMemo(() => {
    if (tab === 'licencia') {
      return documents.find((d) => d.type === 'licencia') || null;
    }
    return (
      documents.find((d) => d.type === tab && d.vehicleId === vehicleId) ||
      documents.find((d) => d.type === tab) ||
      null
    );
  }, [documents, tab, vehicleId]);

  const meta = getDocType(tab);
  const status = doc && meta?.hasExpiry ? getExpiryStatus(doc.expiryDate, warnDays) : 'sin-fecha';
  const ui = STATUS_UI[status];

  // Punto de alerta en las pestañas con documento vencido/por vencer
  const tabAlert = (t) => {
    const dt = getDocType(t);
    if (!dt?.hasExpiry) return null;
    const d =
      t === 'licencia'
        ? documents.find((x) => x.type === 'licencia')
        : documents.find((x) => x.type === t && x.vehicleId === vehicleId) ||
          documents.find((x) => x.type === t);
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

      {/* Patente */}
      <div className="flex flex-col items-center gap-1 py-4">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          Patente
        </span>
        <span className="tabular rounded-lg bg-white/5 px-6 py-2 text-2xl font-extrabold tracking-widest ring-1 ring-white/10">
          {plate}
        </span>
      </div>

      {/* Visor del documento */}
      <div className="relative min-h-0 flex-1 px-4">
        <div
          className={`relative flex h-full items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/10 ${
            bright ? 'bg-white' : 'bg-slate-100'
          }`}
        >
          {doc?.fileBlob ? (
            <FileViewer
              blob={doc.fileBlob}
              fileType={doc.fileType}
              fileName={doc.fileName}
              zoom={zoom}
              className="h-full w-full"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 text-center text-slate-500">
              {meta?.icon ? <meta.icon className="h-12 w-12" strokeWidth={1.5} /> : <Car className="h-12 w-12" />}
              <p className="font-semibold">Sin documento cargado</p>
              <p className="text-sm">Agrega {meta?.title} desde Gestión</p>
            </div>
          )}

          {/* Controles de zoom (solo imágenes) */}
          {doc?.fileBlob && doc.fileType?.startsWith('image/') && (
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
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
            </div>
          )}
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
      <nav className="grid grid-cols-4 gap-1 border-t border-white/10 bg-primary-950 px-2 pb-safe pt-2">
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
    </div>
  );
}
