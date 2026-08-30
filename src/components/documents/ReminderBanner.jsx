import { BellRing, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

/** Resumen compacto de documentos vencidos / por vencer. */
export default function ReminderBanner({ onClick }) {
  const { pendingReminders } = useApp();
  if (!pendingReminders.length) return null;

  const vencidos = pendingReminders.filter((r) => r.status === 'vencido').length;
  const porVencer = pendingReminders.length - vencidos;
  const critical = vencidos > 0;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left shadow-card ring-1 transition active:scale-[0.99] ${
        critical ? 'bg-vencido-soft ring-vencido/20' : 'bg-porvencer-soft ring-porvencer/20'
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          critical ? 'bg-vencido text-white animate-pulse-ring' : 'bg-porvencer text-white'
        }`}
      >
        <BellRing className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block font-bold ${critical ? 'text-vencido-dark' : 'text-porvencer-dark'}`}
        >
          {vencidos > 0 && `${vencidos} vencido${vencidos > 1 ? 's' : ''}`}
          {vencidos > 0 && porVencer > 0 && ' · '}
          {porVencer > 0 && `${porVencer} por vencer`}
        </span>
        <span className="block text-sm text-primary-500">Toca para revisar tus documentos</span>
      </span>
      <ChevronRight
        className={`h-5 w-5 shrink-0 ${critical ? 'text-vencido' : 'text-porvencer'}`}
      />
    </button>
  );
}
