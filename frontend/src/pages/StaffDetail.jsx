import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import StaffPaymentForm from '../components/StaffPaymentForm';

const fmt = (n) =>
  'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

export default function StaffDetail({ staffType }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [deletingPayment, setDeletingPayment] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const label = staffType === 'driver' ? 'Driver' : 'Conductor';
  const listPath = staffType === 'driver' ? '/drivers' : '/conductors';

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(
        `/staff-payments/summary/${staffType}/${id}`
      );
      setSummary(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Data load nahi hua');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, staffType]);

  function openAddPayment() {
    setEditingPayment(null);
    setShowPaymentForm(true);
  }

  function openEditPayment(p) {
    setEditingPayment({
      id: p.id,
      staff_type: staffType,
      staff_id: Number(id),
      payment_date: p.payment_date,
      amount: p.amount,
      payment_method: p.payment_method,
      notes: p.notes,
    });
    setShowPaymentForm(true);
  }

  function closePaymentForm() {
    setShowPaymentForm(false);
    setEditingPayment(null);
  }

  async function confirmDeletePayment() {
    if (!deletingPayment) return;
    setDeleting(true);
    try {
      await api.delete(`/staff-payments/${deletingPayment.id}`);
      setDeletingPayment(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete nahi hua');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <p className="text-content-muted p-6">Loading...</p>;
  if (error) return <p className="text-danger p-6">{error}</p>;
  if (!summary) return null;

  const tripPayments = summary.payments.filter((p) => p.source === 'trip');
  const manualPayments = summary.payments.filter((p) => p.source === 'manual');

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              to={listPath}
              className="text-content-muted hover:text-content text-sm"
            >
              ← {label}s
            </Link>
            <span className="text-content-muted">/</span>
            <span className="text-content text-sm font-medium">
              #{summary.staff_id}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-content">{summary.name}</h1>
          <p className="text-sm text-content-muted mt-1">
            {summary.phone} • {label}
          </p>
        </div>
        <Button onClick={openAddPayment}>+ Add Manual Payment</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="Total Trips"
          value={summary.total_trips}
          color="brand"
        />
        <SummaryCard
          label="From Trips"
          value={fmt(summary.trip_earnings)}
          color="info"
          sub="Trip salaries (auto)"
        />
        <SummaryCard
          label="Manual Payments"
          value={fmt(summary.manual_payments)}
          color="warning"
          sub="Advance / extra diya"
        />
        <SummaryCard
          label="Total Earned"
          value={fmt(summary.total_earned)}
          color="success"
          sub="Grand total"
        />
      </div>

      {/* Payments Ledger */}
      <Card>
        <CardHeader
          title="Payment Ledger"
          subtitle={`${summary.payments.length} entries (${tripPayments.length} trip + ${manualPayments.length} manual)`}
        />
        <CardBody className="p-0">
          {summary.payments.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-content-muted text-sm mb-4">
                Koi payment record nahi. Is driver/conductor ne abhi koi trip
                nahi ki.
              </p>
              <Button onClick={openAddPayment}>+ Add Manual Payment</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-bg text-content-secondary text-xs uppercase">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Date</th>
                    <th className="text-left px-5 py-3 font-medium">Source</th>
                    <th className="text-left px-5 py-3 font-medium">Details</th>
                    <th className="text-right px-5 py-3 font-medium">Amount</th>
                    <th className="text-right px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.payments.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-surface-border hover:bg-surface-hover"
                    >
                      <td className="px-5 py-3 text-content-secondary">
                        {p.payment_date}
                      </td>
                      <td className="px-5 py-3">
                        {p.source === 'trip' ? (
                          <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium border bg-info/10 text-info border-info/20">
                            🚌 Trip
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium border bg-warning/10 text-warning border-warning/20">
                            ✍️ Manual
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-content-secondary text-xs">
                        {p.source === 'trip' && p.trip_id ? (
                          <Link
                            to={`/trips/${p.trip_id}`}
                            className="text-brand hover:underline"
                          >
                            {p.notes || `Trip #${p.trip_id}`}
                          </Link>
                        ) : (
                          <>
                            {p.notes || '—'}
                            {p.payment_method && (
                              <span className="ml-2 text-content-muted capitalize">
                                ({p.payment_method})
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-content">
                        {fmt(p.amount)}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {p.source === 'manual' ? (
                          <>
                            <button
                              onClick={() => openEditPayment(p)}
                              className="text-content-secondary hover:text-brand px-2 py-1"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeletingPayment(p)}
                              className="text-content-secondary hover:text-danger px-2 py-1"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-content-muted">
                            Trip se linked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Manual Payment Form Modal */}
      <Modal
        open={showPaymentForm}
        onClose={closePaymentForm}
        title={
          editingPayment ? 'Edit Manual Payment' : `Add Manual Payment for ${summary.name}`
        }
        size="md"
      >
        <StaffPaymentForm
          payment={editingPayment}
          defaultStaffType={staffType}
          defaultStaffId={id}
          onCancel={closePaymentForm}
          onCreated={() => {
            closePaymentForm();
            load();
          }}
          onUpdated={() => {
            closePaymentForm();
            load();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingPayment)}
        title="Delete Payment?"
        message={
          deletingPayment
            ? `${fmt(deletingPayment.amount)} ki manual payment delete karni hai?`
            : ''
        }
        loading={deleting}
        onConfirm={confirmDeletePayment}
        onCancel={() => setDeletingPayment(null)}
      />
    </div>
  );
}

function SummaryCard({ label, value, color = 'brand', sub }) {
  const map = {
    brand: 'bg-brand-soft border-brand/20 text-brand-dark',
    success: 'bg-success/10 border-success/20 text-success',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    info: 'bg-info/10 text-info border-info/20',
    danger: 'bg-danger/10 border-danger/20 text-danger',
  };
  return (
    <div className={`border rounded-xl p-5 ${map[color]}`}>
      <p className="text-xs uppercase tracking-wide opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  );
}