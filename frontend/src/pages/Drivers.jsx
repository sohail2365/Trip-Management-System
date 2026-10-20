import { useEffect, useState } from 'react';
import api from '../api/client';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Input } from '../components/ui/Input';
import { Link } from 'react-router-dom';

const emptyForm = { name: '', phone: ''};

const fmt = (n) =>
  'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

export default function Drivers() {
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
      const res = await api.get('/drivers');
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name || '',
      phone: item.phone || '',
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
        name: form.name,
        phone: form.phone,
      };
      if (editing) {
        await api.put(`/drivers/${editing.id}`, payload);
      } else {
        await api.post('/drivers', payload);
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Save nahi hua');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      await api.delete(`/drivers/${deleting.id}`);
      setDeleting(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete nahi hua. Shayad is driver ki trips hain.');
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-content">Drivers</h1>
          <p className="text-sm text-content-muted">Total {items.length} drivers</p>
        </div>
        <Button onClick={openCreate}>+ New Driver</Button>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-content-muted">Loading...</p>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-content-muted text-sm">
              Koi driver nahi. + New Driver dabao.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-bg text-content-secondary text-xs uppercase">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">#</th>
                    <th className="text-left px-5 py-3 font-medium">Name</th>
                    <th className="text-left px-5 py-3 font-medium">Phone</th>
                    <th className="text-right px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d) => (
                    <tr key={d.id} className="border-t border-surface-border hover:bg-surface-hover transition">
                    <td className="px-5 py-3">
                      <Link
                        to={`/drivers/${d.id}`}
                        className="text-brand hover:underline font-medium"
                      >
                        #{d.id}
                      </Link>
                    </td>
                      <td className="px-5 py-3 text-content font-medium">{d.name}</td>
                      <td className="px-5 py-3 text-content-secondary">{d.phone}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Link
                        to={`/drivers/${d.id}`}
                        className="inline-block text-content-secondary hover:text-brand px-2 py-1"
                        title="View details"
                      >
                        👁️
                      </Link>
                      <button onClick={() => openEdit(d)} className="text-content-secondary hover:text-brand px-2 py-1">✏️</button>
                      <button onClick={() => setDeleting(d)} className="text-content-secondary hover:text-danger px-2 py-1">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal open={showForm} onClose={closeForm} title={editing ? `Edit Driver #${editing.id}` : 'New Driver'} size="md">
        <form onSubmit={save} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
            placeholder="Ali Khan"
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            required
            placeholder="03001234567"
          />
          <Input
            label="Monthly Salary (PKR)"
            type="number"
            step="1"
            min="0"
            value={form.monthly_salary}
            onChange={(e) => update('monthly_salary', e.target.value)}
          />

          {error && (
            <div className="px-4 py-2 rounded-lg bg-danger/10 text-danger border border-danger/20 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={closeForm}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete Driver?"
        message={deleting ? `Driver "${deleting.name}" delete karna hai?` : ''}
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}