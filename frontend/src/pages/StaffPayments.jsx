import { useEffect, useState } from 'react';
import api from '../api/client';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Select } from '../components/ui/Input';
import StaffPaymentForm from '../components/StaffPaymentForm';

const fmt = (n) =>
  'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

export default function StaffPayments() {
  const [items, setItems] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [conductors, setConductors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState({
    staff_type: '',
    staff_id: '',
    from_date: '',
    to_date: '',
  });

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filters.staff_type) params.staff_type = filters.staff_type;
      if (filters.staff_id) params.staff_id = filters.staff_id;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;

      const res = await api.get('/staff-payments', { params });
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([
      api.get('/drivers').then((r) => setDrivers(r.data)).catch(() => {}),
      api.get('/conductors').then((r) => setConductors(r.data)).catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  function staffName(type, id) {
    const list = type === 'driver' ? drivers : conductors;
    const s = list.find((x) => x.id === id);
    return s ? s.name : `#${id}`;
  }

  function update(key, value) {
    setFilters((p) => ({ ...p, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(item) {
    setEditing(item);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      await api.delete(`/staff-payments/${deleting.id}`);
      setDeleting(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete nahi hua');
    } finally {
      setSaving(false);
    }
  }

  const total = items.reduce((s, x) => s + Number(x.amount), 0);
  const filterStaffList =
    filters.staff_type === 'driver'
      ? drivers
      : filters.staff_type === 'conductor'
        ? conductors
        : [];

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-content">Staff Payments</h1>
          <p className="text-sm text-content-muted">
            Total {items.length} payments • {fmt(total)}
          </p>
        </div>
        <Button onClick={openCreate}>+ New Payment</Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select
              label="Staff Type"
              value={filters.staff_type}
              onChange={(e) => {
                update('staff_type', e.target.value);
                update('staff_id', '');
              }}
            >
              <option value="">All</option>
              <option value="driver">Drivers</option>
              <option value="conductor">Conductors</option>
            </Select>

            {filters.staff_type && (
              <Select
                label="Staff"
                value={filters.staff_id}
                onChange={(e) => update('staff_id', e.target.value)}
              >
                <option value="">All</option>
                {filterStaffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                From
              </label>
              <input
                type="date"
                value={filters.from_date}
                onChange={(e) => update('from_date', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                To
              </label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => update('to_date', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>

            <div className="md:col-span-4 flex justify-end">
              <Button
                variant="secondary"
                onClick={() =>
                  setFilters({
                    staff_type: '',
                    staff_id: '',
                    from_date: '',
                    to_date: '',
                  })
                }
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-content-muted">Loading...</p>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-content-muted text-sm">
              Koi payment record nahi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-bg text-content-secondary text-xs uppercase">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">#</th>
                    <th className="text-left px-5 py-3 font-medium">Date</th>
                    <th className="text-left px-5 py-3 font-medium">Staff</th>
                    <th className="text-left px-5 py-3 font-medium">Type</th>
                    <th className="text-left px-5 py-3 font-medium">Method</th>
                    <th className="text-right px-5 py-3 font-medium">Amount</th>
                    <th className="text-left px-5 py-3 font-medium">Notes</th>
                    <th className="text-right px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-surface-border hover:bg-surface-hover"
                    >
                      <td className="px-5 py-3 text-content-muted">#{p.id}</td>
                      <td className="px-5 py-3 text-content-secondary">
                        {p.payment_date}
                      </td>
                      <td className="px-5 py-3 text-content font-medium">
                        {staffName(p.staff_type, p.staff_id)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${
                            p.staff_type === 'driver'
                              ? 'bg-info/10 text-info border-info/20'
                              : 'bg-brand-soft text-brand-dark border-brand/20'
                          }`}
                        >
                          {p.staff_type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-content-secondary capitalize">
                        {p.payment_method}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-content">
                        {fmt(p.amount)}
                      </td>
                      <td className="px-5 py-3 text-content-muted text-xs">
                        {p.notes || '—'}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-content-secondary hover:text-brand px-2 py-1"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleting(p)}
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
        title={editing ? `Edit Payment #${editing.id}` : 'New Staff Payment'}
        size="md"
      >
        <StaffPaymentForm
          payment={editing}
          onCancel={closeForm}
          onCreated={() => {
            closeForm();
            load();
          }}
          onUpdated={() => {
            closeForm();
            load();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete Payment?"
        message={
          deleting
            ? `${staffName(deleting.staff_type, deleting.staff_id)} ko di gayi ${fmt(deleting.amount)} ki payment delete karni hai?`
            : ''
        }
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}