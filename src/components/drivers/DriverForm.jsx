import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

/** Formulario de creación/edición de conductor (contenido del modal). */
export default function DriverForm({ driver, onDone }) {
  const { saveDriver, removeDriver } = useApp();
  const [form, setForm] = useState({
    name: driver?.name || '',
    run: driver?.run || '',
    phone: driver?.phone || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await saveDriver({ ...driver, ...form });
      onDone?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!driver) return;
    if (!confirm('¿Eliminar el conductor y todos sus documentos personales?')) return;
    await removeDriver(driver.id);
    onDone?.();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label-field" htmlFor="d-name">Nombre completo</label>
        <input
          id="d-name"
          value={form.name}
          onChange={set('name')}
          placeholder="Ej: Ana María Rodríguez"
          className="input-well"
        />
      </div>

      <div>
        <label className="label-field" htmlFor="d-run">RUN / Identificación</label>
        <input
          id="d-run"
          value={form.run}
          onChange={set('run')}
          placeholder="Ej: 12.345.678-9"
          className="input-well tabular uppercase"
        />
      </div>

      <div>
        <label className="label-field" htmlFor="d-phone">Teléfono</label>
        <input
          id="d-phone"
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={set('phone')}
          placeholder="Opcional"
          className="input-well tabular"
        />
      </div>

      <div className="space-y-2 pt-1">
        <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-primary disabled:opacity-60">
          Guardar conductor
        </button>
        {driver && (
          <button onClick={handleDelete} className="btn-danger w-full">
            <Trash2 className="h-5 w-5" /> Eliminar conductor
          </button>
        )}
      </div>
    </div>
  );
}
