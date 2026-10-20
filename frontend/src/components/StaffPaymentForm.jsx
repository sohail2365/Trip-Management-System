import { useEffect, useState } from 'react';
import api from '../api/client';
import { Input, Select } from './ui/Input';
import NumberInput from './ui/NumberInput';
import Button from './ui/Button';

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  staff_type: 'driver',
  staff_id: '',
  payment_date: today(),
  amount: '',
  payment_method: 'cash',
  notes: '',
};

export default function StaffPaymentForm({
  payment = null,
  defaultStaffType = null,
  defaultStaffId = null,
  onCreated,
  onUpdated,
  onCancel,
}) {
  const isEdit = Boolean(payment);

  const [drivers, setDrivers] = useState([]);
  const [conductors, setConductors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [d, c] = await Promise.allSettled([
          api.get('/drivers'),
          api.get('/conductors'),
        ]);
        if (d.status === 'fulfilled') setDrivers(d.value.data);
        if (c.status === 'fulfilled') setConductors(c.value.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (payment) {
      setForm({
        staff_type: payment.staff_type,
        staff_id: String(payment.staff_id),
        payment_date: payment.payment_date,
        amount: String(payment.amount),
        payment_method: payment.payment_method || 'cash',
        notes: payment.notes || '',
      });
    } else if (defaultStaffType && defaultStaffId) {
      setForm((p) => ({
        ...p,
        staff_type: defaultStaffType,
        staff_id: String(defaultStaffId),
      }));
    }
  }, [payment, defaultStaffType, defaultStaffId]);

  function update(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const staffList = form.staff_type === 'driver' ? drivers : conductors;

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        staff_type: form.staff_type,
        staff_id: Number(form.staff_id),
        payment_date: form.payment_date,
        amount: Number(form.amount),
        payment_method: form.payment_method,
        notes: form.notes || null,
      };

      if (isEdit) {
        // Edit mein staff_type/id nahi badal sakte
        await api.put(`/staff-payments/${payment.id}`, {
          payment_date: payload.payment_date,
          amount: payload.amount,
          payment_method: payload.payment_method,
          notes: payload.notes,
        });
        onUpdated?.();
      } else {
        await api.post('/staff-payments', payload);
        onCreated?.();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Save nahi hua');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-content-muted">Loading...</p>;

  return (
    <form onSubmit={save} className="space-y-4">
      {!isEdit && !defaultStaffType && (
        <Select
          label="Staff Type"
          value={form.staff_type}
          onChange={(e) => {
            update('staff_type', e.target.value);
            update('staff_id', '');
          }}
          required
        >
          <option value="driver">Driver</option>
          <option value="conductor">Conductor</option>
        </Select>
      )}

      {(isEdit || !defaultStaffId) && (
        <Select
          label={form.staff_type === 'driver' ? 'Driver' : 'Conductor'}
          value={form.staff_id}
          onChange={(e) => update('staff_id', e.target.value)}
          required
          disabled={isEdit}
        >
          <option value="">-- Select --</option>
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.phone})
            </option>
          ))}
        </Select>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Payment Date"
          type="date"
          value={form.payment_date}
          onChange={(e) => update('payment_date', e.target.value)}
          required
        />
        <NumberInput
          label="Amount (PKR)"
          value={form.amount}
          onChange={(v) => update('amount', v)}
          required
        />
      </div>

      <Select
        label="Payment Method"
        value={form.payment_method}
        onChange={(e) => update('payment_method', e.target.value)}
      >
        {METHODS.map((m) => (
          <option key={m} value={m} className="capitalize">
            {m}
          </option>
        ))}
      </Select>

      <div>
        <label className="block text-xs font-medium text-content-secondary mb-1">
          Notes (optional)
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={2}
          placeholder="Koi extra detail..."
          className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-brand/40"
        />
      </div>

      {error && (
        <div className="px-4 py-2 rounded-lg bg-danger/10 text-danger border border-danger/20 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Update Payment' : 'Save Payment'}
        </Button>
      </div>
    </form>
  );
}