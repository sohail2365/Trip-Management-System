import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Input } from '../components/ui/Input';

const emptyForm = {
  reg_no: '',
  diary_number: '',
  model: '',
  mileage_kmpl: '4',
};

export default function Vehicles() {
  const [items, setItems] = useState([]);
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
      const res = await api.get('/vehicles');
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      reg_no: item.reg_no || '',
      diary_number: item.diary_number || '',
      model: item.model || '',
      mileage_kmpl: String(item.mileage_kmpl ?? '4'),
    });
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setError(null);
  }

  function update(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        reg_no: form.reg_no.trim(),
        diary_number: form.diary_number.trim() || null,
        model: form.model.trim(),
        // Agar mileage khali ho to 4.0 default bhejein taake 422 na aaye
        mileage_kmpl: Number(form.mileage_kmpl) || 4.0, 
      };
      
      if (editing) {
        await api.put(`/vehicles/${editing.id}`, payload);
      } else {
        await api.post('/vehicles', payload);
      }
      closeForm();
      await load();
    } catch (err) {
      // React error #31 fix: Error object ko properly read karein
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d) => `${d.loc[d.loc.length - 1]}: ${d.msg}`).join(', '));
      } else {
        setError(detail || 'Save nahi hua. Data check karein.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      await api.delete(`/vehicles/${deleting.id}`);
      setDeleting(null);
      await load();
    } catch (err) {
      alert(
        err.response?.data?.detail ||
          'Delete nahi hua. Shayad is vehicle ki trips hain.'
      );
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-content">Vehicles</h1>
          <p className="text-sm text-content-muted">
            Total {items.length} vehicles
          </p>
        </div>
        <Button onClick={openCreate}>+ New Vehicle</Button>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-content-muted">Loading...</p>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-content-muted text-sm">
              Koi vehicle nahi. + New Vehicle dabao.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-bg text-content-secondary text-xs uppercase">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">#</th>
                    <th className="text-left px-5 py-3 font-medium">Reg. No</th>
                    <th className="text-left px-5 py-3 font-medium">Diary</th>
                    <th className="text-left px-5 py-3 font-medium">Model</th>
                    <th className="text-right px-5 py-3 font-medium">
                      Mileage (KM/L)
                    </th>
                    <th className="text-right px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((v) => (
                    <tr
                      key={v.id}
                      className="border-t border-surface-border hover:bg-surface-hover transition"
                    >
                      <td className="px-5 py-3 text-content-muted">#{v.id}</td>
                      <td className="px-5 py-3">
                        <Link
                          to={`/vehicles/${v.id}`}
                          className="text-brand hover:underline font-medium"
                        >
                          {v.reg_no}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-content-secondary">
                        {v.diary_number || '—'}
                      </td>
                      <td className="px-5 py-3 text-content-secondary">
                        {v.model}
                      </td>
                      <td className="px-5 py-3 text-right text-content-secondary">
                        {v.mileage_kmpl}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <Link
                          to={`/vehicles/${v.id}`}
                          className="inline-block text-content-secondary hover:text-brand px-2 py-1"
                          title="View details"
                        >
                          👁️
                        </Link>
                        <button
                          onClick={() => openEdit(v)}
                          className="text-content-secondary hover:text-brand px-2 py-1"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleting(v)}
                          className="text-content-secondary hover:text-danger px-2 py-1"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={showForm}
        onClose={closeForm}
        title={editing ? `Edit Vehicle #${editing.id}` : 'New Vehicle'}
        size="md"
      >
        <form onSubmit={save} className="space-y-4">
          <Input
            label="Registration No"
            value={form.reg_no}
            onChange={(e) => update('reg_no', e.target.value)}
            required
            placeholder="LEB-1234"
          />
          <Input
            label="Diary Number (optional)"
            value={form.diary_number}
            onChange={(e) => update('diary_number', e.target.value)}
            placeholder="D-001"
          />
          <Input
            label="Mileage (KM/L)"
            type="number"
            step="0.1"
            min="0.1"
            value={form.mileage_kmpl}
            onChange={(e) => update('mileage_kmpl', e.target.value)}
            required
          />

          {error && (
            <div className="px-4 py-2 rounded-lg bg-danger/10 text-danger border border-danger/20 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete Vehicle?"
        message={
          deleting ? `Vehicle "${deleting.reg_no}" delete karna hai?` : ''
        }
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}