import { useState } from 'react';
import { Car, Bike, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

/** Formulario de creación/edición de vehículo (contenido del modal). */
export default function VehicleForm({ vehicle, onDone }) {
  const { saveVehicle, removeVehicle } = useApp();
  const [form, setForm] = useState({
    name: vehicle?.name || '',
    plate: vehicle?.plate || '',
    brand: vehicle?.brand || '',
    model: vehicle?.model || '',
    year: vehicle?.year || '',
    type: vehicle?.type || 'car',
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await saveVehicle({ ...vehicle, ...form });
      onDone?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!vehicle) return;
    if (!confirm('¿Eliminar el vehículo y todos sus documentos?')) return;
    await removeVehicle(vehicle.id);
    onDone?.();
  };

  return (
    <div className="space-y-4">
      {/* Tipo */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'car', label: 'Automóvil', Icon: Car },
          { key: 'moto', label: 'Motocicleta', Icon: Bike },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setForm((f) => ({ ...f, type: key }))}
            className={`flex items-center justify-center gap-2 rounded-lg py-3 font-semibold transition ${
              form.type === key
                ? 'bg-primary-900 text-white'
                : 'bg-primary-100 text-primary-600'
            }`}
          >
            <Icon className="h-5 w-5" /> {label}
          </button>
        ))}
      </div>

      <div>
        <label className="label-field" htmlFor="v-name">Nombre / Alias</label>
        <input
          id="v-name"
          value={form.name}
          onChange={set('name')}
          placeholder="Ej: Mazda CX-5"
          autoCapitalize="words"
          enterKeyHint="next"
          className="input-well"
        />
      </div>

      <div>
        <label className="label-field" htmlFor="v-plate">Patente</label>
        <input
          id="v-plate"
          value={form.plate}
          onChange={set('plate')}
          placeholder="Ej: JKLM-42"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          className="input-well tabular uppercase"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field" htmlFor="v-brand">Marca</label>
          <input id="v-brand" value={form.brand} onChange={set('brand')} placeholder="Mazda" autoCapitalize="words" enterKeyHint="next" className="input-well" />
        </div>
        <div>
          <label className="label-field" htmlFor="v-model">Modelo</label>
          <input id="v-model" value={form.model} onChange={set('model')} placeholder="CX-5" autoCapitalize="words" enterKeyHint="next" className="input-well" />
        </div>
      </div>

      <div>
        <label className="label-field" htmlFor="v-year">Año</label>
        <input
          id="v-year"
          type="number"
          inputMode="numeric"
          value={form.year}
          onChange={set('year')}
          placeholder="2022"
          enterKeyHint="done"
          className="input-well tabular"
        />
      </div>

      <div className="space-y-2 pt-1">
        <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-primary disabled:opacity-60">
          Guardar vehículo
        </button>
        {vehicle && (
          <button onClick={handleDelete} className="btn-danger w-full">
            <Trash2 className="h-5 w-5" /> Eliminar vehículo
          </button>
        )}
      </div>
    </div>
  );
}
