import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { getExpiryStatus, STATUS_META, daysLabel } from '../../utils/dateUtils.js';

const STYLES = {
  vigente: 'bg-vigente-soft text-vigente-dark',
  porvencer: 'bg-porvencer-soft text-porvencer-dark',
  vencido: 'bg-vencido-soft text-vencido-dark',
  neutral: 'bg-primary-100 text-primary-500',
};

const ICONS = {
  vigente: CheckCircle2,
  porvencer: AlertTriangle,
  vencido: XCircle,
  'sin-fecha': Clock,
};

/**
 * Badge de estado de vencimiento (pill).
 * Puede recibir `status` directo o `expiryDate` (+ warnDays) para calcularlo.
 */
export default function StatusBadge({
  status,
  expiryDate,
  warnDays,
  size = 'md',
  showIcon = true,
  className = '',
}) {
  const resolved = status || getExpiryStatus(expiryDate, warnDays);
  const meta = STATUS_META[resolved] || STATUS_META['sin-fecha'];
  const Icon = ICONS[resolved] || Clock;
  const style = STYLES[meta.color] || STYLES.neutral;
  const sizeClass =
    size === 'lg'
      ? 'px-3.5 py-1.5 text-sm gap-1.5'
      : size === 'sm'
        ? 'px-2 py-0.5 text-[11px] gap-1'
        : 'px-3 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wide ${style} ${sizeClass} ${className}`}
    >
      {showIcon && <Icon className={size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'} strokeWidth={2.5} />}
      {meta.label}
    </span>
  );
}

export { daysLabel };
