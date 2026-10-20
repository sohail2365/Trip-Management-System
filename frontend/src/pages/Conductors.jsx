import { useEffect, useState } from 'react';
import api from '../api/client';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Input } from '../components/ui/Input';

const emptyForm = { name: '', phone: ''};

const fmt = (n) =>
  'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

export default function Conductors() {
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
      const res = await api.get('/conductors');
      setItems(res.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(emptyForm); setError(null); setShowForm(true); }
  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name || '',
      phone: item.phone || '',
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
        name: form.name,
        phone: form.phone,
        monthly_salary: Number(form.monthly_salary) || 0,
      };
      if (editing) await api.put(`/conductors/${editing.id}`, payload);
      else await api.post('/conductors', payload);
      closeForm(); await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Save nahi hua');
    } finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      await api.delete(`/conductors/${deleting.id}`);
      setDeleting(null); await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete nahi hua');
      setDeleting(null);
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-content">Conductors</h1>
          <p className="text-sm text-content-muted">Total {items.length} conductors</p>
        </div>
        <Button onClick={openCreate}>+ New Conductor</Button>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? <p className="p-6 text-sm text-content-muted">Loading...</p>
           : items.length === 0 ? <div className="p-10 text-center text-content-muted text-sm">Koi conductor nahi.</div>
           : (
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
                {items.map((c) => (
                  <tr key={c.id} className="border-t border-surface-border hover:bg-surface-hover">
                    <td className="px-5 py-3 text-content-muted">#{c.id}</td>
                    <td className="px-5 py-3 text-content font-medium">{c.name}</td>
                    <td className="px-5 py-3 text-content-secondary">{c.phone}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(c)} className="text-content-secondary hover:text-brand px-2 py-1">✏️</button>
                      <button onClick={() => setDeleting(c)} className="text-content-secondary hover:text-danger px-2 py-1">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Modal open={showForm} onClose={closeForm} title={editing ? `Edit Conductor #${editing.id}` : 'New Conductor'} size="md">
        <form onSubmit={save} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
          <Input label="Phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
          <Input label="Monthly Salary (PKR)" type="number" value={form.monthly_salary} onChange={(e) => update('monthly_salary', e.target.value)} />
          {error && <div className="px-4 py-2 rounded-lg bg-danger/10 text-danger border border-danger/20 text-sm">{error}</div>}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={closeForm}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete Conductor?"
        message={deleting ? `"${deleting.name}" delete karna hai?` : ''}
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}