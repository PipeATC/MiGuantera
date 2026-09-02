import { useEffect, useRef, useState } from 'react';
import {
  BellRing,
  Download,
  Upload,
  Database,
  Trash2,
  ShieldCheck,
  Fingerprint,
  KeyRound,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import Modal from '../components/ui/Modal.jsx';
import { getStorageEstimate, clearAllData } from '../db/database.js';
import { formatBytes } from '../utils/fileUtils.js';
import { isDeviceAuthSupported } from '../utils/deviceAuth.js';
import {
  notificationsSupported,
  notificationPermission,
  requestNotificationPermission,
} from '../utils/reminders.js';

function Section({ icon: Icon, title, children }) {
  return (
    <section className="card-tactile p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-headline-sm text-primary-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const {
    warnDays,
    updateWarnDays,
    vehicles,
    drivers,
    documents,
    refresh,
    securityLock,
    enableSecurityLock,
    disableSecurityLock,
    changePin,
    exportBackup,
    importBackup,
  } = useApp();

  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const [notifPerm, setNotifPerm] = useState(notificationPermission());
  const [lockSupported, setLockSupported] = useState(null); // null = comprobando
  const [lockBusy, setLockBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [pinEditing, setPinEditing] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [pinForm, setPinForm] = useState({ current: '', next: '', confirm: '' });
  const [exportModal, setExportModal] = useState(false);
  const [exportForm, setExportForm] = useState({ pass: '', confirm: '' });
  const [importFile, setImportFile] = useState(null);
  const [importForm, setImportForm] = useState({ pass: '', replace: false });
  const [backupBusy, setBackupBusy] = useState(false);
  const importRef = useRef(null);

  useEffect(() => {
    getStorageEstimate().then(setStorage);
  }, [documents]);
  useEffect(() => {
    isDeviceAuthSupported().then(setLockSupported);
  }, []);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const handleExport = async () => {
    const { pass, confirm } = exportForm;
    if (pass.length < 6) return flash('La frase debe tener al menos 6 caracteres.');
    if (pass !== confirm) return flash('Las frases no coinciden.');
    setBackupBusy(true);
    try {
      const res = await exportBackup(pass);
      flash(
        `Respaldo cifrado: ${res.vehicles} vehículos, ${res.drivers} conductores, ${res.documents} documentos.`
      );
      setExportModal(false);
      setExportForm({ pass: '', confirm: '' });
    } catch {
      flash('No se pudo generar el respaldo.');
    } finally {
      setBackupBusy(false);
    }
  };

  const handlePickImport = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportFile(file);
    setImportForm({ pass: '', replace: false });
  };

  const handleImport = async () => {
    if (!importFile) return;
    setBackupBusy(true);
    try {
      const res = await importBackup(importFile, importForm.pass, { replace: importForm.replace });
      flash(
        `Importados ${res.vehicles} vehículos, ${res.drivers} conductores y ${res.documents} documentos.`
      );
      setImportFile(null);
    } catch (err) {
      flash(err.message || 'Error al importar el respaldo.');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleEnableNotifs = async () => {
    const perm = await requestNotificationPermission();
    setNotifPerm(perm);
    flash(perm === 'granted' ? 'Recordatorios activados.' : 'Permiso de notificaciones denegado.');
  };

  const setPin = (k) => (e) =>
    setPinForm((f) => ({ ...f, [k]: e.target.value.replace(/\D/g, '').slice(0, 4) }));

  const handleChangePin = async () => {
    const { current, next, confirm } = pinForm;
    if (!/^\d{4}$/.test(next)) return flash('El nuevo PIN debe tener 4 dígitos.');
    if (next !== confirm) return flash('El nuevo PIN no coincide.');
    setPinBusy(true);
    try {
      const ok = await changePin(current, next);
      if (ok) {
        flash('PIN actualizado.');
        setPinForm({ current: '', next: '', confirm: '' });
        setPinEditing(false);
      } else {
        flash('PIN actual incorrecto.');
      }
    } finally {
      setPinBusy(false);
    }
  };

  const handleToggleLock = async () => {
    if (lockBusy) return;
    setLockBusy(true);
    try {
      if (securityLock?.enabled) {
        if (!confirm('¿Desactivar el bloqueo de seguridad? La app se abrirá sin verificación.')) {
          return;
        }
        await disableSecurityLock();
        flash('Bloqueo de seguridad desactivado.');
      } else {
        await enableSecurityLock();
        flash('Bloqueo activado. Se pedirá tu verificación al abrir la app.');
      }
    } catch (err) {
      flash(
        err?.name === 'NotAllowedError'
          ? 'Configuración cancelada.'
          : 'No se pudo activar el bloqueo en este dispositivo.'
      );
    } finally {
      setLockBusy(false);
    }
  };

  // Re-registra la biometría para habilitar el desbloqueo al iniciar (PRF).
  const handleUpgradeBio = async () => {
    if (lockBusy) return;
    setLockBusy(true);
    try {
      await disableSecurityLock();
      const value = await enableSecurityLock();
      flash(
        value?.prf
          ? 'Biometría lista para desbloquear al iniciar la app.'
          : 'Activada, pero este dispositivo no permite biometría al iniciar (usa el PIN).'
      );
    } catch (err) {
      flash(err?.name === 'NotAllowedError' ? 'Configuración cancelada.' : 'No se pudo actualizar.');
    } finally {
      setLockBusy(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('¿Borrar TODOS los datos locales? Esta acción no se puede deshacer.')) return;
    if (!confirm('Confirma nuevamente: se eliminarán vehículos y documentos.')) return;
    await clearAllData();
    await refresh();
    flash('Todos los datos fueron eliminados.');
  };

  const usagePct = storage.quota ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;

  return (
    <div className="mx-auto max-w-lg space-y-4 px-5 pb-28 pt-4">
      <h1 className="text-headline-md text-primary-900">Ajustes</h1>

      {/* Recordatorios */}
      <Section icon={BellRing} title="Recordatorios de vencimiento">
        <label className="label-field" htmlFor="warn-days">
          Avisar cuando falten (días)
        </label>
        <input
          id="warn-days"
          type="number"
          min={1}
          max={180}
          value={warnDays}
          onChange={(e) => updateWarnDays(e.target.value)}
          className="input-well tabular w-28"
        />
        <p className="mt-2 text-sm text-primary-500">
          Los documentos se marcarán "Por Vencer" dentro de este plazo.
        </p>

        {notificationsSupported() && (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-primary-50 px-4 py-3">
            <div className="text-sm">
              <p className="font-semibold text-primary-800">Notificaciones locales</p>
              <p className="text-primary-500">
                {notifPerm === 'granted'
                  ? 'Activadas'
                  : notifPerm === 'denied'
                    ? 'Bloqueadas por el navegador'
                    : 'Recibe alertas al abrir la app'}
              </p>
            </div>
            {notifPerm !== 'granted' && (
              <button
                onClick={handleEnableNotifs}
                disabled={notifPerm === 'denied'}
                className="btn-secondary !w-auto px-4 disabled:opacity-50"
              >
                Activar
              </button>
            )}
          </div>
        )}
      </Section>

      {/* PIN de acceso */}
      <Section icon={KeyRound} title="PIN de acceso">
        <p className="mb-3 text-sm text-primary-500">
          Tu PIN de 4 dígitos protege el acceso a MiGuantera y se pide al abrir la app.
        </p>
        {!pinEditing ? (
          <button onClick={() => setPinEditing(true)} className="btn-secondary !w-auto px-5">
            Cambiar PIN
          </button>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="PIN actual"
                value={pinForm.current}
                onChange={setPin('current')}
                className="input-well tabular text-center tracking-[0.4em]"
              />
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Nuevo PIN"
                value={pinForm.next}
                onChange={setPin('next')}
                className="input-well tabular text-center tracking-[0.4em]"
              />
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Confirmar"
                value={pinForm.confirm}
                onChange={setPin('confirm')}
                className="input-well tabular text-center tracking-[0.4em]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setPinEditing(false);
                  setPinForm({ current: '', next: '', confirm: '' });
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button onClick={handleChangePin} disabled={pinBusy} className="btn-primary disabled:opacity-60">
                {pinBusy ? '…' : 'Guardar PIN'}
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* Seguridad */}
      <Section icon={Fingerprint} title="Biometría (opcional)">
        <p className="mb-3 text-sm text-primary-500">
          Suma un desbloqueo con el método de tu dispositivo —biometría (huella o rostro)
          en el teléfono, o Windows Hello (PIN / huella) en el computador— como complemento
          a tu PIN al abrir la app.
        </p>

        {lockSupported === false ? (
          <div className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-500">
            Este dispositivo o navegador no ofrece un método de verificación compatible.
            Necesitas una conexión segura (https) y biometría o PIN configurado en el sistema.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg bg-primary-50 px-4 py-3">
              <div className="text-sm">
                <p className="font-semibold text-primary-800">
                  {securityLock?.enabled ? 'Activado' : 'Desactivado'}
                </p>
                <p className="text-primary-500">
                  {securityLock?.enabled
                    ? securityLock?.prf
                      ? 'Método principal para entrar; el PIN queda como respaldo.'
                      : 'Disponible al volver de segundo plano.'
                    : lockSupported === null
                      ? 'Comprobando compatibilidad…'
                      : 'Toca para activar el desbloqueo por biometría.'}
                </p>
              </div>
              <button
                onClick={handleToggleLock}
                disabled={lockBusy || lockSupported === null}
                className={`!w-auto px-4 disabled:opacity-50 ${
                  securityLock?.enabled ? 'btn-secondary' : 'btn-primary'
                }`}
              >
                {lockBusy ? '…' : securityLock?.enabled ? 'Desactivar' : 'Activar'}
              </button>
            </div>
            {securityLock?.enabled && !securityLock?.prf && (
              <div className="mt-2 rounded-lg bg-porvencer-soft px-4 py-3 text-sm text-porvencer-dark">
                <p className="mb-2">
                  Para usar la biometría <strong>al iniciar la app</strong> (no solo al volver de
                  segundo plano), vuelve a activarla.
                </p>
                <button
                  onClick={handleUpgradeBio}
                  disabled={lockBusy}
                  className="btn-primary !w-auto px-4 disabled:opacity-50"
                >
                  {lockBusy ? '…' : 'Activar al iniciar'}
                </button>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Respaldo */}
      <Section icon={Database} title="Respaldo cifrado (Exportar / Importar)">
        <p className="mb-3 text-sm text-primary-500">
          Genera un archivo <strong className="font-semibold text-primary-700">cifrado</strong> con
          todos tus documentos e imágenes, protegido por una frase de acceso que tú eliges.
          Guárdalo en un lugar seguro para restaurarlo en otro dispositivo.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setExportModal(true)} className="btn-secondary">
            <Download className="h-5 w-5" /> Exportar
          </button>
          <button onClick={() => importRef.current?.click()} className="btn-secondary">
            <Upload className="h-5 w-5" /> Importar
          </button>
        </div>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handlePickImport}
        />
      </Section>

      {/* Almacenamiento */}
      <Section icon={Database} title="Almacenamiento local">
        <div className="flex items-center justify-between text-sm">
          <span className="text-primary-500">
            {vehicles.length} vehículos · {drivers.length} conductores · {documents.length} documentos
          </span>
          <span className="tabular font-semibold text-primary-700">
            {formatBytes(storage.usage)}
            {storage.quota ? ` / ${formatBytes(storage.quota)}` : ''}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${usagePct}%` }} />
        </div>
      </Section>

      {/* Privacidad */}
      <Section icon={ShieldCheck} title="Privacidad">
        <p className="text-sm text-primary-500">
          MiGuantera funciona 100% en tu dispositivo. No hay servidores ni APIs externas: tus
          documentos nunca salen de este navegador.
        </p>
        <button onClick={handleClearAll} className="btn-danger mt-4 w-full">
          <Trash2 className="h-5 w-5" /> Borrar todos los datos
        </button>
      </Section>

      <div className="flex items-center justify-center gap-2 pt-2 text-xs text-primary-400">
        <Info className="h-4 w-4" /> MiGuantera · PWA offline-first · v1.1
      </div>

      {/* Modal: exportar respaldo cifrado */}
      <Modal
        open={exportModal}
        onClose={() => setExportModal(false)}
        subtitle="Respaldo cifrado"
        title="Exportar respaldo"
      >
        <div className="space-y-4">
          <p className="text-sm text-primary-500">
            Elige una frase de acceso (mínimo 6 caracteres). La necesitarás para restaurar el
            respaldo; guárdala bien, no se puede recuperar.
          </p>
          <div>
            <label className="label-field" htmlFor="exp-pass">Frase de acceso</label>
            <input
              id="exp-pass"
              type="password"
              autoComplete="new-password"
              value={exportForm.pass}
              onChange={(e) => setExportForm((f) => ({ ...f, pass: e.target.value }))}
              className="input-well"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="exp-confirm">Confirmar frase</label>
            <input
              id="exp-confirm"
              type="password"
              autoComplete="new-password"
              value={exportForm.confirm}
              onChange={(e) => setExportForm((f) => ({ ...f, confirm: e.target.value }))}
              className="input-well"
            />
          </div>
          <button onClick={handleExport} disabled={backupBusy} className="btn-primary disabled:opacity-60">
            <Download className="h-5 w-5" /> {backupBusy ? 'Generando…' : 'Exportar cifrado'}
          </button>
        </div>
      </Modal>

      {/* Modal: importar respaldo */}
      <Modal
        open={!!importFile}
        onClose={() => setImportFile(null)}
        subtitle="Restaurar respaldo"
        title="Importar respaldo"
      >
        <div className="space-y-4">
          <p className="text-sm text-primary-500">
            Ingresa la frase de acceso del respaldo para descifrarlo.
          </p>
          <div>
            <label className="label-field" htmlFor="imp-pass">Frase de acceso</label>
            <input
              id="imp-pass"
              type="password"
              autoComplete="off"
              value={importForm.pass}
              onChange={(e) => setImportForm((f) => ({ ...f, pass: e.target.value }))}
              className="input-well"
            />
          </div>
          <label className="flex items-start gap-2.5 rounded-lg bg-primary-50 px-4 py-3">
            <input
              type="checkbox"
              checked={importForm.replace}
              onChange={(e) => setImportForm((f) => ({ ...f, replace: e.target.checked }))}
              className="mt-0.5 h-4 w-4"
            />
            <span className="text-sm text-primary-700">
              <span className="font-semibold">Reemplazar todos los datos actuales.</span>{' '}
              Si lo dejas sin marcar, el respaldo se combinará con lo existente.
            </span>
          </label>
          <button onClick={handleImport} disabled={backupBusy} className="btn-primary disabled:opacity-60">
            <Upload className="h-5 w-5" /> {backupBusy ? 'Importando…' : 'Importar'}
          </button>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[90%] animate-slide-up rounded-full bg-primary-900 px-5 py-3 text-center text-sm font-semibold text-white shadow-card">
          {toast}
        </div>
      )}
    </div>
  );
}
