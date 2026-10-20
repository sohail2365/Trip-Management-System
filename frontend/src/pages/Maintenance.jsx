import { useEffect, useState } from 'react';
import api from '../api/client';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Input, Select } from '../components/ui/Input';
import NumberInput from '../components/ui/NumberInput';

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) =>
  'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

const TYPES = ['Body Work', 'Colour', 'Light', 'Engine Work', 'Oil', 'Hissa Work', 'Leather', 'Brake', 'Radiator', 'Stearing', 'Tyres', 'Battery', 'Gear', 'Generator'];

const emptyForm = {
  vehicle_id: '',
  maintenance_date: today(),
  maintenance_type: 'servicing',
  description: '',
  amount: '',
  odometer_km: '',
  vendor: '',
};

export default function Maintenance() {
  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [filterVehicle, setFilterVehicle] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const params = filterVehicle ? { vehicle_id: filterVehicle } : {};
      const [m, v] = await Promise.all([
        api.get('/maintenance', { params }),
        api.get('/vehicles'),
      ]);
      setItems(m.data);
      setVehicles(v.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterVehicle]);

  function vehicleName(id) {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.reg_no}${v.diary_number ? ` (${v.diary_number})` : ''}` : `#${id}`;
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setError(null); setShowForm(true); }
  function openEdit(item) {
    setEditing(item);
    setForm({
      vehicle_id: String(item.vehicle_id),
      maintenance_date: item.maintenance_date,
      maintenance_type: item.maintenance_type,
      description: item.description || '',
      amount: String(item.amount),
      odometer_km: item.odometer_km ? String(item.odometer_km) : '',
      vendor: item.vendor || '',
    });
    setError(null); setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditing(null); setError(null); }
  function update(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const payload = {
        vehicle_id: Number(form.vehicle_id),
        maintenance_date: form.maintenance_date,
        maintenance_type: form.maintenance_type,
        description: form.description || null,
        amount: Number(form.amount) || 0,
        odometer_km: form.odometer_km ? Number(form.odometer_km) : null,
        vendor: form.vendor || null,
      };
      if (editing) await api.put(`/maintenance/${editing.id}`, payload);
      else await api.post('/maintenance', payload);
      closeForm(); await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Save nahi hua');
    } finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      await api.delete(`/maintenance/${deleting.id}`);
      setDeleting(null); await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete nahi hua');
      setDeleting(null);
    } finally { setSaving(false); }
  }

  const total = items.reduce((s, x) => s + Number(x.amount), 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-content">Vehicle Maintenance</h1>
          <p className="text-sm text-content-muted">
            Total {items.length} entries • {fmt(total)}
          </p>
        </div>
        <Button onClick={openCreate}>+ New Entry</Button>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select
              label="Filter by Vehicle"
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
            >
              <option value="">All vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.reg_no} {v.diary_number ? `(${v.diary_number})` : ''}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          {loading ? <p className="p-6 text-sm text-content-muted">Loading...</p>
           : items.length === 0 ? <div className="p-10 text-center text-content-muted text-sm">Koi entry nahi.</div>
           : (
            <table className="w-full text-sm">
              <thead className="bg-surface-bg text-content-secondary text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-left px-5 py-3 font-medium">Vehicle</th>
                  <th className="text-left px-5 py-3 font-medium">Type</th>
                  <th className="text-left px-5 py-3 font-medium">Description</th>
                  <th className="text-right px-5 py-3 font-medium">Amount</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id} className="border-t border-surface-border hover:bg-surface-hover">
                    <td className="px-5 py-3 text-content-secondary">{m.maintenance_date}</td>
                    <td className="px-5 py-3 text-content">{vehicleName(m.vehicle_id)}</td>
                    <td className="px-5 py-3 text-content-secondary capitalize">{m.maintenance_type}</td>
                    <td className="px-5 py-3 text-content-secondary">{m.description || '—'}</td>
                    <td className="px-5 py-3 text-right font-semibold text-content">{fmt(m.amount)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(m)} className="text-content-secondary hover:text-brand px-2 py-1">✏️</button>
                      <button onClick={() => setDeleting(m)} className="text-content-secondary hover:text-danger px-2 py-1">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Modal open={showForm} onClose={closeForm} title={editing ? 'Edit Entry' : 'New Maintenance Entry'} size="md">
        <form onSubmit={save} className="space-y-4">
          <Select label="Vehicle" value={form.vehicle_id} onChange={(e) => update('vehicle_id', e.target.value)} required>
            <option value="">-- Select --</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.reg_no} {v.diary_number ? `(${v.diary_number})` : ''} — {v.model}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={form.maintenance_date} onChange={(e) => update('maintenance_date', e.target.value)} required />
            <Select label="Type" value={form.maintenance_type} onChange={(e) => update('maintenance_type', e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>

          <Input label="Description" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Engine oil change" />

          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Amount (PKR)" value={form.amount} onChange={(v) => update('amount', v)} required />
            <NumberInput label="Odometer (KM)" value={form.odometer_km} onChange={(v) => update('odometer_km', v)} placeholder="optional" />
          </div>

          <Input label="Vendor / Workshop" value={form.vendor} onChange={(e) => update('vendor', e.target.value)} placeholder="Ali Auto Workshop" />

          {error && <div className="px-4 py-2 rounded-lg bg-danger/10 text-danger border border-danger/20 text-sm">{error}</div>}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={closeForm}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete Entry?"
        message={deleting ? `${fmt(deleting.amount)} ka ${deleting.maintenance_type} entry delete karni hai?` : ''}
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}