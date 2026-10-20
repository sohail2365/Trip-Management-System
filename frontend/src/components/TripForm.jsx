import { useEffect, useState } from 'react';
import api from '../api/client';
import { Input, Select } from './ui/Input';
import NumberInput from './ui/NumberInput';
import QuickAddSelect from './ui/QuickAddSelect';
import WaypointsInput from './ui/WaypointsInput';
import Button from './ui/Button';

const fmt = (n) =>
  'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

const today = () => new Date().toISOString().slice(0, 10);

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const FUEL_MARKUP = 2;

const emptyVehicleRow = () => ({
  vehicle_id: '',
  driver_id: '',
  conductor_id: '',
  mileage_kmpl: '4',
  salary: '',
  conductor_salary: '',
  toll: '',
  allowance: '',
  extra: '',
});

const emptyForm = {
  client_id: '',
  booking_date: today(),
  travel_date: today(),
  travel_time: '',
  travel_day: '',
  shift: 'day',
  tour_days: '',
  tour_nights: '',
  source: '',
  destination: '',
  distance_km: '',
  is_round_trip: false,
  client_rent: '',
  shift_extra: '',
  notes: '',
  waypoints: [],
  vehicles: [emptyVehicleRow()],
};

export default function TripForm({ trip = null, onCreated, onUpdated, onCancel }) {
  const isEdit = Boolean(trip);

  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [conductors, setConductors] = useState([]);
  const [rate, setRate] = useState(null);
  const [settings, setSettings] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [originalRate, setOriginalRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [calculating, setCalculating] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeError, setRouteError] = useState(null);

  async function loadAll() {
    const [c, v, d, co, r, s] = await Promise.allSettled([
      api.get('/clients'),
      api.get('/vehicles'),
      api.get('/drivers'),
      api.get('/conductors'),
      api.get('/fuel/rate'),
      api.get('/settings'),
    ]);
    if (c.status === 'fulfilled') setClients(c.value.data);
    if (v.status === 'fulfilled') setVehicles(v.value.data);
    if (d.status === 'fulfilled') setDrivers(d.value.data);
    if (co.status === 'fulfilled') setConductors(co.value.data);
    if (r.status === 'fulfilled') setRate(r.value.data);
    if (s.status === 'fulfilled') setSettings(s.value.data);
  }

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!trip) return;

    let cancelled = false;
    async function fill() {
      try {
        const res = await api.get(`/trips/${trip.id}/detail`);
        if (cancelled) return;
        const t = res.data;

        setForm({
          client_id: String(t.client?.id || ''),
          booking_date: t.booking_date || today(),
          travel_date: t.travel_date || today(),
          travel_time: t.travel_time || '',
          travel_day: t.travel_day || '',
          shift: t.shift || 'day',
          tour_days: t.tour_days ? String(t.tour_days) : '',
          tour_nights:
            t.tour_nights !== null && t.tour_nights !== undefined
              ? String(t.tour_nights)
              : '',
          source: t.source || '',
          destination: t.destination || '',
          distance_km: String(t.distance_km || ''),
          is_round_trip: Boolean(t.is_round_trip),
          client_rent: String(t.client_rent || ''),
          shift_extra: t.shift_extra ? String(t.shift_extra) : '',
          notes: t.notes || '',
          waypoints:
            t.waypoints?.map((w) => ({
              stop_name: w.stop_name,
              arrival_time: w.arrival_time || '',
            })) || [],
          vehicles:
            t.vehicles?.map((v) => ({
              vehicle_id: String(v.vehicle?.id || ''),
              driver_id: String(v.driver?.id || ''),
              conductor_id: v.conductor?.id ? String(v.conductor.id) : '',
              mileage_kmpl: String(v.mileage_kmpl || '4'),
              salary: v.salary ? String(v.salary) : '',
              conductor_salary: v.conductor_salary ? String(v.conductor_salary) : '',
              toll: v.toll ? String(v.toll) : '',
              allowance: v.allowance ? String(v.allowance) : '',
              extra: v.extra ? String(v.extra) : '',
            })) || [emptyVehicleRow()],
        });
        setOriginalRate(t.vehicles?.[0]?.diesel_rate || null);
      } catch (err) {
        setError('Trip detail load nahi hui');
      }
    }
    fill();
    return () => {
      cancelled = true;
    };
  }, [trip]);

  function update(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function updateVehicleRow(index, key, value) {
    setForm((p) => {
      const next = [...p.vehicles];
      next[index] = { ...next[index], [key]: value };
      return { ...p, vehicles: next };
    });
  }

  function addVehicleRow() {
    setForm((p) => ({ ...p, vehicles: [...p.vehicles, emptyVehicleRow()] }));
  }

  function removeVehicleRow(index) {
    if (form.vehicles.length <= 1) return;
    setForm((p) => ({ ...p, vehicles: p.vehicles.filter((_, i) => i !== index) }));
  }

  function handleVehicleSelect(index, vehicleId) {
    const v = vehicles.find((x) => String(x.id) === String(vehicleId));
    updateVehicleRow(index, 'vehicle_id', vehicleId);
    if (v) updateVehicleRow(index, 'mileage_kmpl', String(v.mileage_kmpl));
  }

  // Vehicle label: reg_no if selected
  function getVehicleLabel(idx) {
    const row = form.vehicles[idx];
    const v = vehicles.find((x) => String(x.id) === String(row.vehicle_id));
    return v ? v.reg_no : `Bus #${idx + 1}`;
  }

  useEffect(() => {
    if (form.travel_date) {
      const d = new Date(form.travel_date + 'T00:00:00');
      const day = DAYS[(d.getDay() + 6) % 7];
      setForm((p) => (p.travel_day === day ? p : { ...p, travel_day: day }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.travel_date]);

  useEffect(() => {
    if (!settings || isEdit) return;
    const val =
      form.shift === 'night'
        ? settings.night_shift_extra
        : settings.day_shift_extra;
    setForm((p) => ({ ...p, shift_extra: String(val || 0) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.shift, settings, isEdit]);

  useEffect(() => {
    if (!routeInfo) return;
    const total = form.is_round_trip ? routeInfo.one_way_km * 2 : routeInfo.one_way_km;
    setForm((p) => ({ ...p, distance_km: String(total) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.is_round_trip, routeInfo]);

  async function handleCalculateRoute() {
    setRouteError(null);
    setRouteInfo(null);

    if (!form.source.trim() || !form.destination.trim()) {
      setRouteError('Source aur Destination dono likho');
      return;
    }

    setCalculating(true);
    try {
      const waypointNames = form.waypoints
        .map((w) => w.stop_name.trim())
        .filter(Boolean);

      const res = await api.post('/routes/calculate', {
        source: form.source.trim(),
        destination: form.destination.trim(),
        waypoints: waypointNames,
        country: 'Pakistan',
      });

      const oneWay = res.data.distance_km;
      const etaOneWay = res.data.eta_hours;
      const total = form.is_round_trip ? oneWay * 2 : oneWay;
      const etaTotal = form.is_round_trip ? etaOneWay * 2 : etaOneWay;

      update('distance_km', String(total));
      setRouteInfo({
        one_way_km: oneWay,
        one_way_eta: etaOneWay,
        total_km: total,
        total_eta: etaTotal,
        stops: waypointNames.length,
      });
    } catch (err) {
      setRouteError(
        err.response?.data?.detail || 'Route calculate nahi hua. City name check karo.'
      );
    } finally {
      setCalculating(false);
    }
  }

  const rawRate = isEdit ? originalRate || 0 : rate?.rate_pkr || 0;
  const currentRate = isEdit ? rawRate : rawRate + FUEL_MARKUP;
  const distance = Number(form.distance_km) || 0;

  const vehicleCalcs = form.vehicles.map((v) => {
    const mileage = Number(v.mileage_kmpl) || 0;
    const litres = mileage > 0 ? distance / mileage : 0;
    const fuel = litres * currentRate;
    const salary = Number(v.salary) || 0;
    const condSalary = Number(v.conductor_salary) || 0;
    const toll = Number(v.toll) || 0;
    const allowance = Number(v.allowance) || 0;
    const extra = Number(v.extra) || 0;
    const totalExp =
      fuel + salary + condSalary + toll + allowance + extra;
    return { fuel, litres, salary, condSalary, toll, allowance, extra, totalExp };
  });

  const totalFuel = vehicleCalcs.reduce((s, v) => s + v.fuel, 0);
  const totalDriver = vehicleCalcs.reduce((s, v) => s + v.salary, 0);
  const totalConductor = vehicleCalcs.reduce((s, v) => s + v.condSalary, 0);
  const totalToll = vehicleCalcs.reduce((s, v) => s + v.toll, 0);
  const totalAllowance = vehicleCalcs.reduce((s, v) => s + v.allowance, 0);
  const totalExtra = vehicleCalcs.reduce((s, v) => s + v.extra, 0);
  const shiftExtra = Number(form.shift_extra) || 0;
  const rent = Number(form.client_rent) || 0;

  const totalExpense =
    totalFuel + totalDriver + totalConductor + totalToll
    + totalAllowance + totalExtra + shiftExtra;
  const profit = rent - totalExpense;
  const margin = rent > 0 ? (profit / rent) * 100 : 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!isEdit && !rate) {
      setError('Aaj ka diesel rate set nahi hai. Pehle Fuel Rate page se set karo.');
      return;
    }

    if (form.vehicles.length === 0) {
      setError('Kam az kam ek vehicle add karo');
      return;
    }

    for (let i = 0; i < form.vehicles.length; i++) {
      const v = form.vehicles[i];
      if (!v.vehicle_id || !v.driver_id) {
        setError(`Bus #${i + 1}: vehicle aur driver dono select karo`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        client_id: Number(form.client_id),
        booking_date: form.booking_date,
        travel_date: form.travel_date,
        travel_time: form.travel_time || null,
        travel_day: form.travel_day || null,
        shift: form.shift,
        tour_days: form.tour_days ? Number(form.tour_days) : null,
        tour_nights: form.tour_nights !== '' ? Number(form.tour_nights) : null,
        source: form.source,
        destination: form.destination,
        distance_km: distance,
        is_round_trip: Boolean(form.is_round_trip),
        client_rent: rent,
        shift_extra: shiftExtra,
        notes: form.notes || null,
        waypoints: form.waypoints.filter((w) => w.stop_name.trim()),
        vehicles: form.vehicles.map((v) => ({
          vehicle_id: Number(v.vehicle_id),
          driver_id: Number(v.driver_id),
          conductor_id: v.conductor_id ? Number(v.conductor_id) : null,
          mileage_kmpl: Number(v.mileage_kmpl) || 4,
          salary: Number(v.salary) || 0,
          conductor_salary: Number(v.conductor_salary) || 0,
          toll: Number(v.toll) || 0,
          allowance: Number(v.allowance) || 0,
          extra: Number(v.extra) || 0,
        })),
      };

      if (isEdit) {
        await api.put(`/trips/${trip.id}`, payload);
        onUpdated?.();
      } else {
        await api.post('/trips', payload);
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
        {!isEdit && !rate && (
          <div className="px-4 py-2 rounded-lg bg-warning/10 text-warning border border-warning/20 text-sm">
            ⚠️ Aaj ka diesel rate set nahi hai. Pehle Fuel Rate page se set karo.
          </div>
        )}

        {/* CLIENT */}
        <section>
          <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-3">
            Client
          </h3>
          <QuickAddSelect
            label="Client"
            value={form.client_id}
            onChange={(v) => update('client_id', v)}
            options={clients}
            createEndpoint="/clients"
            createFields={[
              { key: 'name', label: 'Name', required: true },
              { key: 'phone', label: 'Phone', required: true },
              { key: 'cnic', label: 'CNIC (optional)' },
            ]}
            getOptionLabel={(c) => c.name}
            onEntityCreated={(c) => setClients((p) => [...p, c])}
            required
          />
        </section>

        {/* SCHEDULE */}
        <section>
          <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-3">
            Schedule
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Booking Date" type="date" value={form.booking_date} onChange={(e) => update('booking_date', e.target.value)} required />
            <Input label="Travel Date" type="date" value={form.travel_date} onChange={(e) => update('travel_date', e.target.value)} required />
            <Input label="Departure Time" value={form.travel_time} onChange={(e) => update('travel_time', e.target.value)} placeholder="08:30 AM" />
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">Day (auto)</label>
              <div className="px-3 py-2 text-sm bg-surface-bg border border-surface-border rounded-lg text-content-secondary">
                {form.travel_day || '—'}
              </div>
            </div>
            <Select label="Shift" value={form.shift} onChange={(e) => update('shift', e.target.value)}>
              <option value="day">Day</option>
              <option value="night">Night</option>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput label="Tour Days" value={form.tour_days} onChange={(v) => update('tour_days', v)} placeholder="3" />
              <NumberInput label="Tour Nights" value={form.tour_nights} onChange={(v) => update('tour_nights', v)} placeholder="2" />
            </div>
          </div>
        </section>

        {/* ROUTE */}
        <section>
          <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-3">
            Route
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Input label="Source" value={form.source} onChange={(e) => update('source', e.target.value)} placeholder="Faisalabad" required />
            <Input label="Destination" value={form.destination} onChange={(e) => update('destination', e.target.value)} placeholder="Multan" required />

            <div className="col-span-2 flex items-center gap-3 p-3 bg-surface-bg border border-surface-border rounded-lg">
              <input type="checkbox" id="round_trip" checked={form.is_round_trip} onChange={(e) => update('is_round_trip', e.target.checked)} className="w-4 h-4 text-brand border-surface-border rounded focus:ring-brand/40" />
              <label htmlFor="round_trip" className="flex-1 text-sm text-content cursor-pointer select-none">
                <span className="font-medium">Round Trip (Wapsi bhi)</span>
                <span className="block text-xs text-content-muted mt-0.5">Distance double hogi</span>
              </label>
            </div>

            <NumberInput label={`Distance (KM)${form.is_round_trip ? ' — Total' : ''}`} value={form.distance_km} onChange={(v) => update('distance_km', v)} required placeholder="650" />
          </div>

          <div className="mb-4">
            <button
              type="button"
              onClick={handleCalculateRoute}
              disabled={calculating}
              className="w-full px-4 py-2.5 text-sm font-medium border-2 border-dashed border-brand/40 text-brand rounded-lg hover:bg-brand-soft/50 hover:border-brand transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {calculating ? (
                <>
                  <span className="w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                  Calculating...
                </>
              ) : (
                <>🧭 Auto Calculate Distance from API</>
              )}
            </button>

            {routeError && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-danger/10 text-danger border border-danger/20 text-xs">
                {routeError}
              </div>
            )}

            {routeInfo && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-success/10 text-success border border-success/20 text-xs">
                {form.is_round_trip ? (
                  <>✅ Round Trip: <strong>{routeInfo.total_km} KM</strong> (One-way {routeInfo.one_way_km} × 2)</>
                ) : (
                  <>✅ Distance: <strong>{routeInfo.one_way_km} KM</strong></>
                )}
                {routeInfo.stops > 0 && ` • ${routeInfo.stops} stops`}
              </div>
            )}
          </div>

          <WaypointsInput value={form.waypoints} onChange={(v) => update('waypoints', v)} />
        </section>

        {/* VEHICLES (CONVOY) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wide">
              Vehicles (Convoy) — {form.vehicles.length}
            </h3>
            <button type="button" onClick={addVehicleRow} className="text-xs text-brand hover:underline font-medium">
              + Add Another Bus
            </button>
          </div>

          <div className="space-y-4">
            {form.vehicles.map((v, idx) => {
              const calc = vehicleCalcs[idx];
              const vehicleLabel = getVehicleLabel(idx);
              const vehicleObj = vehicles.find((x) => String(x.id) === String(v.vehicle_id));
              return (
                <div key={idx} className="border border-surface-border rounded-lg p-4 bg-surface-bg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-bold text-content">
                        {vehicleObj ? `🚌 ${vehicleObj.reg_no}` : `Bus #${idx + 1}`}
                      </span>
                      {vehicleObj && (
                        <span className="text-xs text-content-muted ml-2">
                          #{idx + 1} • {vehicleObj.model}
                        </span>
                      )}
                    </div>
                    {form.vehicles.length > 1 && (
                      <button type="button" onClick={() => removeVehicleRow(idx)} className="text-xs text-danger hover:underline">
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  {/* Assignment */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <QuickAddSelect
                      label="Vehicle"
                      value={v.vehicle_id}
                      onChange={(val) => handleVehicleSelect(idx, val)}
                      options={vehicles}
                      createEndpoint="/vehicles"
                      createFields={[
                        { key: 'reg_no', label: 'Reg No', required: true },
                        { key: 'diary_number', label: 'Diary No (optional)' },
                        { key: 'model', label: 'Model', required: true },
                        { key: 'mileage_kmpl', label: 'Mileage KM/L', type: 'number', required: true, default: '4' },
                      ]}
                      getOptionLabel={(x) => `${x.reg_no} • ${x.model}`}
                      onEntityCreated={(x) => setVehicles((p) => [...p, x])}
                      required
                    />
                    <QuickAddSelect
                      label="Driver"
                      value={v.driver_id}
                      onChange={(val) => updateVehicleRow(idx, 'driver_id', val)}
                      options={drivers}
                      createEndpoint="/drivers"
                      createFields={[
                        { key: 'name', label: 'Name', required: true },
                        { key: 'phone', label: 'Phone', required: true },
                        { key: 'monthly_salary', label: 'Monthly Salary', type: 'number', default: '0' },
                      ]}
                      getOptionLabel={(d) => d.name}
                      onEntityCreated={(d) => setDrivers((p) => [...p, d])}
                      required
                    />
                    <QuickAddSelect
                      label="Conductor (optional)"
                      value={v.conductor_id}
                      onChange={(val) => updateVehicleRow(idx, 'conductor_id', val)}
                      options={conductors}
                      createEndpoint="/conductors"
                      createFields={[
                        { key: 'name', label: 'Name', required: true },
                        { key: 'phone', label: 'Phone', required: true },
                        { key: 'monthly_salary', label: 'Monthly Salary', type: 'number', default: '0' },
                      ]}
                      getOptionLabel={(c) => c.name}
                      onEntityCreated={(c) => setConductors((p) => [...p, c])}
                      placeholder="-- None --"
                    />
                    <NumberInput label="Mileage (KM/L)" value={v.mileage_kmpl} onChange={(val) => updateVehicleRow(idx, 'mileage_kmpl', val)} required />
                  </div>

                  {/* Expenses */}
                  <div className="border-t border-surface-border pt-3">
                    <p className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-2">
                      Is Bus Ke Expenses
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <NumberInput label="Driver Salary (PKR)" value={v.salary} onChange={(val) => updateVehicleRow(idx, 'salary', val)} placeholder="0" />
                      <NumberInput label="Conductor Salary (PKR)" value={v.conductor_salary} onChange={(val) => updateVehicleRow(idx, 'conductor_salary', val)} placeholder="0" />
                      <NumberInput label="Toll (PKR)" value={v.toll} onChange={(val) => updateVehicleRow(idx, 'toll', val)} placeholder="0" />
                      <NumberInput label="Allowance (PKR)" value={v.allowance} onChange={(val) => updateVehicleRow(idx, 'allowance', val)} placeholder="0" />
                      <NumberInput label="Extra (PKR)" value={v.extra} onChange={(val) => updateVehicleRow(idx, 'extra', val)} placeholder="0" />
                    </div>
                  </div>

                  {/* Mini calc */}
                  <div className="mt-3 pt-3 border-t border-surface-border flex flex-wrap gap-4 text-xs text-content-muted">
                    <span>Litres: <strong className="text-content">{calc.litres.toFixed(2)} L</strong></span>
                    <span>Fuel: <strong className="text-content">{fmt(calc.fuel)}</strong></span>
                    <span>Total Exp: <strong className="text-content">{fmt(calc.totalExp)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* TRIP-LEVEL */}
        <section>
          <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-3">
            Trip Income & Convoy Expenses
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Client Rent (PKR)" value={form.client_rent} onChange={(v) => update('client_rent', v)} required />
            <NumberInput label={`Shift Extra (PKR) — ${form.shift}`} value={form.shift_extra} onChange={(v) => update('shift_extra', v)} placeholder="0" />
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-content-secondary mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} placeholder="Koi khaas instruction..." className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-brand/40" />
          </div>
        </section>

        {error && (
          <div className="px-4 py-2 rounded-lg bg-danger/10 text-danger border border-danger/20 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* STICKY SIDEBAR */}
      <div className="lg:col-span-1">
        <div className="bg-surface-bg border border-surface-border rounded-xl p-5 sticky top-4">
          <h3 className="text-sm font-semibold text-content mb-4">Live Calculation</h3>

          {isEdit && originalRate && (
            <div className="mb-3 px-3 py-2 rounded-md bg-info/10 text-info border border-info/20 text-xs">
              Original effective rate: PKR {originalRate}/L
            </div>
          )}

          {!isEdit && rate && (
            <div className="mb-3 px-3 py-2 rounded-md bg-info/10 text-info border border-info/20 text-xs">
              OGRA {fmt(rate.rate_pkr)} + Markup {fmt(FUEL_MARKUP)} ={' '}
              <strong>{fmt(currentRate)}/L</strong>
            </div>
          )}

          <div className="space-y-3 text-sm">
            <CalcRow label="Effective Rate" value={`${fmt(currentRate)} /L`} />
            <CalcRow label="Distance" value={`${distance} KM`} />
            <CalcRow label="Buses" value={form.vehicles.length} />

            <div className="border-t border-surface-border pt-3 mt-3">
              <p className="text-xs text-content-muted mb-2">Fuel (per bus)</p>
              {vehicleCalcs.map((calc, i) => (
                <div key={i} className="flex justify-between text-xs mb-1">
                  <span className="text-content-muted">{getVehicleLabel(i)}</span>
                  <span className="text-content">{fmt(calc.fuel)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-surface-border pt-3 space-y-2">
              <CalcRow label="Total Fuel" value={fmt(totalFuel)} bold />
              <CalcRow label="Driver Salaries" value={fmt(totalDriver)} muted />
              <CalcRow label="Conductor Salaries" value={fmt(totalConductor)} muted />
              <CalcRow label="Toll" value={fmt(totalToll)} muted />
              <CalcRow label="Allowance" value={fmt(totalAllowance)} muted />
              <CalcRow label="Extra" value={fmt(totalExtra)} muted />
              <CalcRow label="Shift Extra" value={fmt(shiftExtra)} muted />
            </div>

            <div className="border-t border-surface-border pt-3">
              <CalcRow label="Total Expense" value={fmt(totalExpense)} bold />
            </div>
            <div className="border-t border-surface-border pt-3">
              <CalcRow label="Client Rent" value={fmt(rent)} bold />
            </div>
            <div className="border-t-2 border-brand/30 pt-3">
              <CalcRow label="Net Profit" value={fmt(profit)} bold highlight={profit >= 0 ? 'success' : 'danger'} />
              <p className="text-xs text-content-muted mt-1">Margin: {margin.toFixed(2)}%</p>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Saving...' : isEdit ? 'Update Trip' : 'Create Trip'}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function CalcRow({ label, value, muted, bold, highlight }) {
  const cls =
    highlight === 'success'
      ? 'text-success'
      : highlight === 'danger'
        ? 'text-danger'
        : bold
          ? 'text-content font-semibold'
          : muted
            ? 'text-content-muted'
            : 'text-content';
  return (
    <div className="flex justify-between">
      <span className={muted ? 'text-content-muted' : 'text-content-secondary'}>{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}