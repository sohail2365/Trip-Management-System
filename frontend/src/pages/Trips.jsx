import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { Select } from '../components/ui/Input';
import TripForm from '../components/TripForm';

const fmt = (n) =>
  'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [deletingTrip, setDeletingTrip] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [filters, setFilters] = useState({
    status_filter: '',
    from_date: '',
    to_date: '',
  });

  async function loadTrips() {
    setLoading(true);
    try {
      const params = {};
      if (filters.status_filter) params.status_filter = filters.status_filter;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;

      const res = await api.get('/trips', { params });
      setTrips(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get('/clients').then((r) => setClients(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  function clientName(id) {
    const c = clients.find((x) => x.id === id);
    return c ? c.name : `#${id}`;
  }

  function update(key, value) {
    setFilters((p) => ({ ...p, [key]: value }));
  }

  function openCreate() {
    setEditingTrip(null);
    setShowForm(true);
  }

  function openEdit(trip) {
    setEditingTrip(trip);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTrip(null);
  }

  async function confirmDelete() {
    if (!deletingTrip) return;
    setDeleting(true);
    try {
      await api.delete(`/trips/${deletingTrip.id}`);
      setDeletingTrip(null);
      await loadTrips();
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete nahi hua');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-content">Trips</h1>
          <p className="text-sm text-content-muted">Total {trips.length} trips</p>
        </div>
        <Button onClick={openCreate}>+ New Trip</Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select
              label="Status"
              value={filters.status_filter}
              onChange={(e) => update('status_filter', e.target.value)}
            >
              <option value="">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                From Date
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
                To Date
              </label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => update('to_date', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={() =>
                  setFilters({ status_filter: '', from_date: '', to_date: '' })
                }
                className="w-full"
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
          ) : trips.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-content-muted text-sm">
                Koi trip nahi mili. Filters change karo ya nayi trip banao.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-bg text-content-secondary text-xs uppercase">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">#</th>
                    <th className="text-left px-5 py-3 font-medium">Travel</th>
                    <th className="text-left px-5 py-3 font-medium">Route</th>
                    <th className="text-left px-5 py-3 font-medium">Client</th>
                    <th className="text-right px-5 py-3 font-medium">Distance</th>
                    <th className="text-right px-5 py-3 font-medium">Rent</th>
                    <th className="text-right px-5 py-3 font-medium">Profit</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-right px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((t) => (
                    <tr
                      key={t.id}
                      className={`border-t border-surface-border hover:bg-surface-hover transition ${
                        t.status === 'cancelled' ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="px-5 py-3">
                        <Link
                          to={`/trips/${t.id}`}
                          className="text-brand hover:underline font-medium"
                        >
                          #{t.id}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-content">
                        {t.travel_date}
                        <span className="block text-xs text-content-muted capitalize">
                          {t.shift}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-content">
                        {t.source} → {t.destination}
                      </td>
                      <td className="px-5 py-3 text-content-secondary">
                        {clientName(t.client_id)}
                      </td>
                      <td className="px-5 py-3 text-right text-content-secondary">
                        {t.distance_km} KM
                      </td>
                      <td className="px-5 py-3 text-right text-content">
                        {fmt(t.client_rent)}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-semibold ${
                          t.net_profit >= 0 ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {fmt(t.net_profit)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge status={t.status} />
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <Link
                          to={`/trips/${t.id}`}
                          className="inline-block text-content-secondary hover:text-brand px-2 py-1"
                          title="View details"
                        >
                          👁️
                        </Link>
                        <button
                          onClick={() => openEdit(t)}
                          className="text-content-secondary hover:text-brand px-2 py-1"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeletingTrip(t)}
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

      {/* Create/Edit Modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={editingTrip ? `Edit Trip #${editingTrip.id}` : 'New Trip'}
        size="xl"
      >
        <TripForm
          trip={editingTrip}
          onCancel={closeForm}
          onCreated={() => {
            closeForm();
            loadTrips();
          }}
          onUpdated={() => {
            closeForm();
            loadTrips();
          }}
        />
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={Boolean(deletingTrip)}
        onClose={() => setDeletingTrip(null)}
        title="Delete Trip?"
        size="sm"
      >
        {deletingTrip && (
          <div>
            <p className="text-sm text-content-secondary mb-4">
              Kya waqai trip{' '}
              <strong className="text-content">#{deletingTrip.id}</strong> (
              {deletingTrip.source} → {deletingTrip.destination}) delete karni
              hai? Ye action wapas nahi ho sakti.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setDeletingTrip(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}