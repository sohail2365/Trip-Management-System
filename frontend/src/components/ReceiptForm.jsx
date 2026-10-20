import { useEffect, useState } from 'react';
import api from '../api/client';
import { Input, Select } from './ui/Input';
import PhoneField from './ui/PhoneField';
import Button from './ui/Button';

const today = () => new Date().toISOString().slice(0, 10);

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const emptyForm = {
  receipt_date: today(),
  travel_date: '',
  travel_time: '',
  travel_day: '',
  tour_days: '',
  tour_nights: '',
  client_id: '',
  trip_id: '',
  client_name: '',
  client_phone: '',
  client_phone_alt: '',
  route_from: '',
  route_to: '',
  bus_number: '',
  total_amount: '',
  advance_amount: '',
  driver_name: '',
  driver_phone: '',
  driver_phone_alt: '',
  conductor_name: '',
  conductor_phone: '',
  conductor_phone_alt: '',
  notes: '',
  status: 'issued',
};

export default function ReceiptForm({ receipt = null, onCreated, onUpdated, onCancel }) {
  const isEdit = Boolean(receipt);

  const [clients, setClients] = useState([]);
  const [trips, setTrips] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Per-bus data jab linked trip multi-bus ho
  const [tripVehicles, setTripVehicles] = useState([]);

  // ─── Load dropdowns ───
  useEffect(() => {
    async function load() {
      try {
        const [c, t] = await Promise.allSettled([
          api.get('/clients'),
          api.get('/trips'),
        ]);
        if (c.status === 'fulfilled') setClients(c.value.data);
        if (t.status === 'fulfilled') setTrips(t.value.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ─── Edit mode fill ───
  useEffect(() => {
    if (receipt) {
      setForm({
        receipt_date: receipt.receipt_date || today(),
        travel_date: receipt.travel_date || '',
        travel_time: receipt.travel_time || '',
        travel_day: receipt.travel_day || '',
        tour_days: receipt.tour_days ? String(receipt.tour_days) : '',
        tour_nights:
          receipt.tour_nights !== null && receipt.tour_nights !== undefined
            ? String(receipt.tour_nights)
            : '',
        client_id: receipt.client_id ? String(receipt.client_id) : '',
        trip_id: receipt.trip_id ? String(receipt.trip_id) : '',
        client_name: receipt.client_name || '',
        client_phone: receipt.client_phone || '',
        client_phone_alt: receipt.client_phone_alt || '',
        route_from: receipt.route_from || '',
        route_to: receipt.route_to || '',
        bus_number: receipt.bus_number || '',
        total_amount: String(receipt.total_amount || ''),
        advance_amount: String(receipt.advance_amount || ''),
        driver_name: receipt.driver_name || '',
        driver_phone: receipt.driver_phone || '',
        driver_phone_alt: receipt.driver_phone_alt || '',
        conductor_name: receipt.conductor_name || '',
        conductor_phone: receipt.conductor_phone || '',
        conductor_phone_alt: receipt.conductor_phone_alt || '',
        notes: receipt.notes || '',
        status: receipt.status || 'issued',
      });

      // Edit mode mein bhi trip vehicles load karo (agar linked trip hai)
      if (receipt.trip_id) {
        api.get(`/trips/${receipt.trip_id}/detail`)
          .then((res) => setTripVehicles(res.data.vehicles || []))
          .catch(() => setTripVehicles([]));
      }
    }
  }, [receipt]);

  function update(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  // ─── Auto-compute travel_day ───
  useEffect(() => {
    if (form.travel_date) {
      const d = new Date(form.travel_date + 'T00:00:00');
      const day = DAYS[(d.getDay() + 6) % 7];
      setForm((p) => (p.travel_day === day ? p : { ...p, travel_day: day }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.travel_date]);

  // ─── Client select → auto-fill ───
  useEffect(() => {
    if (form.client_id) {
      const c = clients.find((x) => String(x.id) === String(form.client_id));
      if (c) {
        setForm((p) => ({
          ...p,
          client_name: c.name,
          client_phone: c.phone,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.client_id, clients]);

  // ─── Trip select → poori detail auto-fill (convoy aware) ───
  useEffect(() => {
    if (!form.trip_id) {
      setTripVehicles([]);
      return;
    }

    let cancelled = false;
    async function loadTripDetail() {
      try {
        const res = await api.get(`/trips/${form.trip_id}/detail`);
        if (cancelled) return;
        const t = res.data;

        // Store per-bus data
        setTripVehicles(t.vehicles || []);

        // Multiple buses/drivers/conductors comma-separated (backend store ke liye)
        const busNumbers = (t.vehicles || [])
          .map((v) => v.vehicle?.reg_no)
          .filter(Boolean);
        const driverNames = (t.vehicles || [])
          .map((v) => v.driver?.name)
          .filter(Boolean);
        const driverPhones = (t.vehicles || [])
          .map((v) => v.driver?.phone)
          .filter(Boolean);
        const conductorNames = (t.vehicles || [])
          .map((v) => v.conductor?.name)
          .filter(Boolean);
        const conductorPhones = (t.vehicles || [])
          .map((v) => v.conductor?.phone)
          .filter(Boolean);

        setForm((p) => ({
          ...p,
          route_from: t.source || p.route_from,
          route_to: t.destination || p.route_to,
          bus_number: busNumbers.join(', ') || p.bus_number,
          travel_date: t.travel_date || p.travel_date,
          travel_time: t.travel_time || p.travel_time,
          travel_day: t.travel_day || p.travel_day,
          tour_days:
            t.tour_days !== null && t.tour_days !== undefined
              ? String(t.tour_days)
              : p.tour_days,
          tour_nights:
            t.tour_nights !== null && t.tour_nights !== undefined
              ? String(t.tour_nights)
              : p.tour_nights,
          client_id: !p.client_id && t.client ? String(t.client.id) : p.client_id,
          client_name: t.client?.name || p.client_name,
          client_phone: t.client?.phone || p.client_phone,
          driver_name: driverNames.join(', ') || p.driver_name,
          driver_phone: driverPhones.join(', ') || p.driver_phone,
          conductor_name: conductorNames.join(', ') || p.conductor_name,
          conductor_phone: conductorPhones.join(', ') || p.conductor_phone,
          total_amount: String(t.client_rent || p.total_amount),
          notes: !p.notes && t.notes ? t.notes : p.notes,
        }));
      } catch (err) {
        console.error('Trip detail load fail:', err);
      }
    }

    loadTripDetail();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.trip_id]);

  const total = Number(form.total_amount) || 0;
  const advance = Number(form.advance_amount) || 0;
  const due = Math.max(0, total - advance);

  const isMultiBus = tripVehicles.length > 1;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (advance > total) {
      setError('Advance amount total se zyada nahi ho sakti');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        receipt_date: form.receipt_date,
        travel_date: form.travel_date || null,
        travel_time: form.travel_time || null,
        travel_day: form.travel_day || null,
        tour_days: form.tour_days !== '' ? Number(form.tour_days) : null,
        tour_nights: form.tour_nights !== '' ? Number(form.tour_nights) : null,
        client_id: form.client_id ? Number(form.client_id) : null,
        trip_id: form.trip_id ? Number(form.trip_id) : null,
        client_name: form.client_name,
        client_phone: form.client_phone,
        client_phone_alt: form.client_phone_alt || null,
        route_from: form.route_from,
        route_to: form.route_to,
        bus_number: form.bus_number,
        total_amount: total,
        advance_amount: advance,
        driver_name: form.driver_name,
        driver_phone: form.driver_phone,
        driver_phone_alt: form.driver_phone_alt || null,
        conductor_name: form.conductor_name || null,
        conductor_phone: form.conductor_phone || null,
        conductor_phone_alt: form.conductor_phone_alt || null,
        notes: form.notes || null,
        status: form.status,
      };

      if (isEdit) {
        await api.put(`/receipts/${receipt.id}`, payload);
        onUpdated?.();
      } else {
        await api.post('/receipts', payload);
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
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* RECEIPT INFO */}
        <section>
          <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-3">
            Receipt Information
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Receipt Date" type="date" value={form.receipt_date} onChange={(e) => update('receipt_date', e.target.value)} required />
            <Input label="Travel Date (optional)" type="date" value={form.travel_date} onChange={(e) => update('travel_date', e.target.value)} />
            <Input label="Departure Time" value={form.travel_time} onChange={(e) => update('travel_time', e.target.value)} placeholder="08:30 AM" />
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">Day (auto)</label>
              <div className="px-3 py-2 text-sm bg-surface-bg border border-surface-border rounded-lg text-content-secondary">
                {form.travel_day || '—'}
              </div>
            </div>
            <Input label="Tour Days (optional)" type="number" min="1" value={form.tour_days} onChange={(e) => update('tour_days', e.target.value)} placeholder="3" />
            <Input label="Tour Nights (optional)" type="number" min="0" value={form.tour_nights} onChange={(e) => update('tour_nights', e.target.value)} placeholder="2" />
            <Select label="Linked Trip (optional)" value={form.trip_id} onChange={(e) => update('trip_id', e.target.value)}>
              <option value="">-- None --</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.id} — {t.source} → {t.destination}
                </option>
              ))}
            </Select>
            <Select label="Linked Client (optional)" value={form.client_id} onChange={(e) => update('client_id', e.target.value)}>
              <option value="">-- None --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
        </section>

        {/* CLIENT */}
        <section>
          <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-3">
            Client
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Client Name" value={form.client_name} onChange={(e) => update('client_name', e.target.value)} required />
            <PhoneField
              label="Client Phone"
              primaryValue={form.client_phone}
              altValue={form.client_phone_alt}
              onPrimaryChange={(v) => update('client_phone', v)}
              onAltChange={(v) => update('client_phone_alt', v)}
              required
            />
          </div>
        </section>

        {/* ROUTE */}
        <section>
          <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-3">
            Route & Vehicle
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="From" value={form.route_from} onChange={(e) => update('route_from', e.target.value)} required />
            <Input label="To" value={form.route_to} onChange={(e) => update('route_to', e.target.value)} required />
            {!isMultiBus && (
              <Input label="Bus Number" value={form.bus_number} onChange={(e) => update('bus_number', e.target.value)} required />
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════ */}
        {/* MULTI-BUS: read-only per-bus assignment table */}
        {/* SINGLE BUS: editable Driver + Conductor sections */}
        {/* ═══════════════════════════════════════════════════ */}

        {isMultiBus ? (
          <section>
            <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-3">
              Vehicles & Staff ({tripVehicles.length} buses)
            </h3>
            <div className="border border-surface-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-bg text-content-secondary text-xs uppercase">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Bus</th>
                    <th className="text-left px-3 py-2 font-medium">Bus No</th>
                    <th className="text-left px-3 py-2 font-medium">Driver</th>
                    <th className="text-left px-3 py-2 font-medium">Conductor</th>
                  </tr>
                </thead>
                <tbody>
                  {tripVehicles.map((v) => (
                    <tr key={v.id} className="border-t border-surface-border">
                      <td className="px-3 py-2 text-content-muted">#{v.order_no}</td>
                      <td className="px-3 py-2 text-content font-medium">
                        {v.vehicle?.reg_no || '—'}
                        {v.vehicle?.model && (
                          <span className="block text-xs text-content-muted font-normal">
                            {v.vehicle.model}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-content">
                        <span className="font-medium">{v.driver?.name || '—'}</span>
                        {v.driver?.phone && (
                          <span className="block text-xs text-content-muted">
                            {v.driver.phone}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-content">
                        {v.conductor ? (
                          <>
                            <span className="font-medium">{v.conductor.name}</span>
                            {v.conductor.phone && (
                              <span className="block text-xs text-content-muted">
                                {v.conductor.phone}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-content-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-content-muted mt-2">
              ℹ️ Multi-bus receipt — staff details upar wali table mein per-bus dikhengi.
              Receipt print mein bhi yeh table show hogi.
            </p>
          </section>
        ) : (
          <>
            {/* DRIVER (single bus) */}
            <section>
              <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-3">
                Driver
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Driver Name" value={form.driver_name} onChange={(e) => update('driver_name', e.target.value)} required />
                <PhoneField
                  label="Driver Phone"
                  primaryValue={form.driver_phone}
                  altValue={form.driver_phone_alt}
                  onPrimaryChange={(v) => update('driver_phone', v)}
                  onAltChange={(v) => update('driver_phone_alt', v)}
                  required
                />
              </div>
            </section>

            {/* CONDUCTOR (single bus) */}
            <section>
              <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-3">
                Conductor (optional)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Conductor Name" value={form.conductor_name} onChange={(e) => update('conductor_name', e.target.value)} />
                <PhoneField
                  label="Conductor Phone"
                  primaryValue={form.conductor_phone}
                  altValue={form.conductor_phone_alt}
                  onPrimaryChange={(v) => update('conductor_phone', v)}
                  onAltChange={(v) => update('conductor_phone_alt', v)}
                />
              </div>
            </section>
          </>
        )}

        {/* NOTES & STATUS */}
        <section>
          <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-3">
            Notes
          </h3>
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={2}
            placeholder="Koi extra note..."
            className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
          <div className="mt-3">
            <Select label="Status" value={form.status} onChange={(e) => update('status', e.target.value)}>
              <option value="issued">Issued</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
        </section>

        {error && (
          <div className="px-4 py-2 rounded-lg bg-danger/10 text-danger border border-danger/20 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* AMOUNT SIDEBAR */}
      <div className="lg:col-span-1">
        <div className="bg-surface-bg border border-surface-border rounded-xl p-5 sticky top-4">
          <h3 className="text-sm font-semibold text-content mb-4">Amount</h3>

          <div className="space-y-3">
            <Input label="Total Booking Amount (PKR)" type="number" step="1" min="1" value={form.total_amount} onChange={(e) => update('total_amount', e.target.value)} required />
            <Input label="Advance Paid (PKR)" type="number" step="1" min="0" value={form.advance_amount} onChange={(e) => update('advance_amount', e.target.value)} />
          </div>

          <div className="mt-5 pt-4 border-t border-surface-border">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-content-secondary">Total</span>
              <span className="font-medium text-content">PKR {total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-content-secondary">Advance</span>
              <span className="font-medium text-success">− PKR {advance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm pt-3 border-t border-surface-border mt-3">
              <span className="font-semibold text-content">Due</span>
              <span className={`font-bold text-lg ${due > 0 ? 'text-danger' : 'text-success'}`}>
                PKR {due.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Saving...' : isEdit ? 'Update Receipt' : 'Create Receipt'}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}