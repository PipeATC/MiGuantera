/**
 * Recordatorios de vencimiento de documentos.
 *
 * Al no existir backend ni push server, los recordatorios se evalúan
 * localmente cada vez que la app se abre. Si el usuario concede permiso,
 * se emite una Notification local por cada documento vencido o por vencer,
 * evitando repetir la misma alerta el mismo día (persistido en localStorage).
 */

import { getExpiryStatus, daysLabel } from './dateUtils.js';
import { getDocType } from './docTypes.js';
import { asset } from './assets.js';

const SEEN_KEY = 'miguantera:remindersSeen';

function loadSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveSeen(map) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(map));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission() {
  return notificationsSupported() ? Notification.permission : 'denied';
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * Calcula la lista de documentos que requieren atención.
 * @returns [{ doc, vehicle, status, label }]
 */
export function computePendingReminders(documents, vehicles, warnDays) {
  const vehById = new Map(vehicles.map((v) => [v.id, v]));
  const pending = [];
  for (const doc of documents) {
    const type = getDocType(doc.type);
    if (!type || !type.hasExpiry || !doc.expiryDate) continue;
    const status = getExpiryStatus(doc.expiryDate, warnDays);
    if (status === 'vencido' || status === 'porvencer') {
      pending.push({
        doc,
        vehicle: doc.vehicleId ? vehById.get(doc.vehicleId) : null,
        status,
        label: daysLabel(doc.expiryDate),
        typeLabel: type.title,
      });
    }
  }
  // Vencidos primero, luego por fecha más próxima
  pending.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'vencido' ? -1 : 1;
    return (a.doc.expiryDate || '').localeCompare(b.doc.expiryDate || '');
  });
  return pending;
}

/**
 * Emite notificaciones locales para los recordatorios pendientes,
 * una sola vez por documento por día.
 */
export function fireReminderNotifications(pending) {
  if (notificationPermission() !== 'granted' || !pending.length) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const seen = loadSeen();
  let fired = 0;

  for (const item of pending) {
    const key = `${item.doc.id}:${today}`;
    if (seen[key]) continue;

    const vehicleName = item.vehicle ? ` · ${item.vehicle.name}` : '';
    const title =
      item.status === 'vencido'
        ? `⛔ ${item.typeLabel} vencido`
        : `⚠️ ${item.typeLabel} por vencer`;
    try {
      new Notification(title, {
        body: `${item.label}${vehicleName}`,
        icon: asset('icons/icon-192.png'),
        badge: asset('icons/icon-192.png'),
        tag: `miguantera-${item.doc.id}`,
      });
      seen[key] = true;
      fired += 1;
    } catch {
      /* ignore */
    }
  }

  // Limpieza: conservar solo las marcas de hoy
  const pruned = {};
  for (const k of Object.keys(seen)) {
    if (k.endsWith(`:${today}`)) pruned[k] = true;
  }
  saveSeen(pruned);
  return fired;
}
