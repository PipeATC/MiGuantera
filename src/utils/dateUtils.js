/**
 * Utilidades de fecha y cálculo de vencimiento.
 * Fechas almacenadas como ISO 'yyyy-mm-dd' (sin hora, zona local).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Umbral por defecto (días) para considerar "Por Vencer". */
export const DEFAULT_WARN_DAYS = 30;

/** Parsea 'yyyy-mm-dd' a Date local a medianoche. */
export function parseISODate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Días restantes hasta la fecha (negativo si ya venció). */
export function daysUntil(iso) {
  const target = parseISODate(iso);
  if (!target) return null;
  return Math.round((target - startOfToday()) / MS_PER_DAY);
}

/**
 * Estado de vencimiento de un documento.
 * @returns {'vigente'|'porvencer'|'vencido'|'sin-fecha'}
 */
export function getExpiryStatus(iso, warnDays = DEFAULT_WARN_DAYS) {
  if (!iso) return 'sin-fecha';
  const days = daysUntil(iso);
  if (days === null) return 'sin-fecha';
  if (days < 0) return 'vencido';
  if (days <= warnDays) return 'porvencer';
  return 'vigente';
}

export const STATUS_META = {
  vigente: { label: 'Vigente', color: 'vigente' },
  porvencer: { label: 'Por Vencer', color: 'porvencer' },
  vencido: { label: 'Vencido', color: 'vencido' },
  'sin-fecha': { label: 'Sin fecha', color: 'neutral' },
};

/** Texto amigable de días restantes. */
export function daysLabel(iso) {
  const days = daysUntil(iso);
  if (days === null) return 'N/A';
  if (days < 0) {
    const abs = Math.abs(days);
    return `Venció hace ${abs} ${abs === 1 ? 'día' : 'días'}`;
  }
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Quedan ${days} días`;
}

const MONTHS_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

/** '12 Oct 2026' */
export function formatDate(iso) {
  const d = parseISODate(iso);
  if (!d) return 'N/A';
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

/** '31/03/2025' */
export function formatDateShort(iso) {
  const d = parseISODate(iso);
  if (!d) return 'N/A';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** ISO de hoy 'yyyy-mm-dd'. */
export function todayISO() {
  const t = startOfToday();
  const mm = String(t.getMonth() + 1).padStart(2, '0');
  const dd = String(t.getDate()).padStart(2, '0');
  return `${t.getFullYear()}-${mm}-${dd}`;
}
