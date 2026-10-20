import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ReceiptForm from '../components/ReceiptForm';

const fmt = (n) =>
  'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

export default function Receipts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/receipts');
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setShowForm(true); }
  function openEdit(item) { setEditing(item); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      await api.delete(`/receipts/${deleting.id}`);
      setDeleting(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete nahi hua');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-content">Receipts</h1>
          <p className="text-sm text-content-muted">Total {items.length} receipts</p>
        </div>
        <Button onClick={openCreate}>+ New Receipt</Button>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-content-muted">Loading...</p>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-content-muted text-sm">
              Koi receipt nahi. + New Receipt dabao.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-bg text-content-secondary text-xs uppercase">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">#</th>
                    <th className="text-left px-5 py-3 font-medium">Date</th>
                    <th className="text-left px-5 py-3 font-medium">Client</th>
                    <th className="text-left px-5 py-3 font-medium">Route</th>
                    <th className="text-right px-5 py-3 font-medium">Total</th>
                    <th className="text-right px-5 py-3 font-medium">Advance</th>
                    <th className="text-right px-5 py-3 font-medium">Due</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-right px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-t border-surface-border hover:bg-surface-hover transition">
                      <td className="px-5 py-3">
                        <Link to={`/receipts/${r.id}`} className="text-brand hover:underline font-medium">
                          {r.receipt_number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-content-secondary">{r.receipt_date}</td>
                      <td className="px-5 py-3 text-content">{r.client_name}</td>
                      <td className="px-5 py-3 text-content-secondary">{r.route_from} → {r.route_to}</td>
                      <td className="px-5 py-3 text-right text-content">{fmt(r.total_amount)}</td>
                      <td className="px-5 py-3 text-right text-success">{fmt(r.advance_amount)}</td>
                      <td className={`px-5 py-3 text-right font-semibold ${Number(r.due_amount) > 0 ? 'text-danger' : 'text-success'}`}>
                        {fmt(r.due_amount)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${
                          r.status === 'paid' ? 'bg-success/10 text-success border-success/20' :
                          r.status === 'cancelled' ? 'bg-danger/10 text-danger border-danger/20' :
                          'bg-info/10 text-info border-info/20'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <Link to={`/receipts/${r.id}`} className="inline-block text-content-secondary hover:text-brand px-2 py-1" title="View">👁️</Link>
                        <button onClick={() => openEdit(r)} className="text-content-secondary hover:text-brand px-2 py-1" title="Edit">✏️</button>
                        <button onClick={() => setDeleting(r)} className="text-content-secondary hover:text-danger px-2 py-1" title="Delete">🗑️</button>
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
        title={editing ? `Edit ${editing.receipt_number}` : 'New Receipt'}
        size="xl"
      >
        <ReceiptForm
          receipt={editing}
          onCancel={closeForm}
          onCreated={() => { closeForm(); load(); }}
          onUpdated={() => { closeForm(); load(); }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete Receipt?"
        message={deleting ? `Receipt "${deleting.receipt_number}" delete karni hai?` : ''}
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}