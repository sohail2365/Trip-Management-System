import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const fmt = (n) =>
  'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

const fmt2 = (n) =>
  Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/trips/${id}/detail`);
      setTrip(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Trip load nahi hui');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function changeStatus(newStatus) {
    if (!confirm(`Status "${newStatus}" karna hai?`)) return;
    setUpdating(true);
    try {
      await api.patch(`/trips/${id}/status?new_status=${newStatus}`);
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Status update nahi hua');
    } finally {
      setUpdating(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) return <p className="text-content-muted">Loading...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!trip) return null;

  const nextStatuses =
    {
      scheduled: ['ongoing', 'cancelled'],
      ongoing: ['completed', 'cancelled'],
      completed: [],
      cancelled: ['scheduled'],
    }[trip.status] || [];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6 print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/trips" className="text-content-muted hover:text-content text-sm">← Trips</Link>
            <span className="text-content-muted">/</span>
            <span className="text-content text-sm font-medium">#{trip.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-content">
            {trip.source} → {trip.destination}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            {trip.is_round_trip && (
              <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-brand-soft text-brand-dark border border-brand/20">
                🔄 Round Trip
              </span>
            )}
            <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-info/10 text-info border border-info/20">
              🚌 {trip.vehicle_count} Vehicle{trip.vehicle_count > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-sm text-content-muted mt-2">
            {trip.travel_date}
            {trip.travel_day && ` • ${trip.travel_day}`}
            {trip.travel_time && ` • ${trip.travel_time}`}
            {` • ${trip.shift}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handlePrint}>🖨️ Print</Button>
        </div>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Trip #{trip.id} — Summary</h1>
        <p className="text-sm">
          {trip.travel_date}
          {trip.travel_day && ` • ${trip.travel_day}`}
          {trip.travel_time && ` • ${trip.travel_time}`}
        </p>
      </div>

      <Card className="mb-6 print:hidden">
        <CardBody>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-content-secondary">Status:</span>
              <Badge status={trip.status} />
            </div>
            <div className="flex gap-2">
              {nextStatuses.map((s) => (
                <Button key={s} size="sm" variant={s === 'cancelled' ? 'danger' : 'primary'} onClick={() => changeStatus(s)} disabled={updating}>
                  Mark {s}
                </Button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <HeroCard label="Client Rent" value={fmt(trip.client_rent)} color="info" />
        <HeroCard label="Total Expense" value={fmt(trip.total_expense)} color="warning" />
        <HeroCard label="Net Profit" value={fmt(trip.net_profit)} color={trip.net_profit >= 0 ? 'success' : 'danger'} sub={`Margin: ${trip.profit_margin_percent}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader title="Trip Information" />
          <CardBody className="space-y-0">
            <InfoRow label="Booking Date" value={trip.booking_date} />
            <InfoRow label="Travel Date" value={trip.travel_date} />
            <InfoRow label="Departure Time" value={trip.travel_time || '—'} />
            <InfoRow label="Day" value={trip.travel_day || '—'} />
            <InfoRow label="Shift" value={trip.shift} capitalize />
            <InfoRow label="Distance" value={`${trip.distance_km} KM`} />
            {trip.tour_days && (
              <InfoRow label="Tour Duration" value={`${trip.tour_days} days, ${trip.tour_nights || 0} nights`} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Client" />
          <CardBody className="space-y-0">
            <InfoRow label="Name" value={trip.client ? trip.client.name : '—'} />
            <InfoRow label="Phone" value={trip.client ? trip.client.phone : '—'} />
          </CardBody>
        </Card>
      </div>

      {/* CONVOY */}
      <Card className="mb-6">
        <CardHeader title="Convoy — Vehicles & Staff" subtitle={`${trip.vehicles.length} vehicle${trip.vehicles.length > 1 ? 's' : ''}`} />
        <CardBody className="space-y-4">
          {trip.vehicles.map((v) => (
            <div key={v.id} className="border border-surface-border rounded-lg p-4 bg-surface-bg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-content">
                  🚌 {v.vehicle?.reg_no || `Bus #${v.order_no}`}
                  {v.vehicle?.diary_number && (
                    <span className="text-xs text-content-muted ml-2 font-normal">
                      [{v.vehicle.diary_number}]
                    </span>
                  )}
                  <span className="text-xs text-content-muted ml-2 font-normal">
                    #{v.order_no}
                  </span>
                </span>
                <span className="text-xs text-content-muted">
                  {v.vehicle?.model || ''}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                <div>
                  <p className="text-xs text-content-muted">Driver</p>
                  <p className="font-medium text-content">{v.driver?.name || '—'}</p>
                  <p className="text-xs text-content-muted">{v.driver?.phone || ''}</p>
                </div>
                {v.conductor && (
                  <div>
                    <p className="text-xs text-content-muted">Conductor</p>
                    <p className="font-medium text-content">{v.conductor.name}</p>
                    <p className="text-xs text-content-muted">{v.conductor.phone}</p>
                  </div>
                )}
              </div>

              {/* Expenses */}
              <div className="pt-3 border-t border-surface-border">
                <p className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-2">
                  Is Bus Ke Expenses
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <MiniStat label="Mileage" value={`${v.mileage_kmpl} KM/L`} />
                  <MiniStat label="Rate" value={`${fmt2(v.diesel_rate)}/L`} />
                  <MiniStat label="Litres" value={`${v.litres_used} L`} />
                  <MiniStat label="Fuel" value={fmt(v.fuel_expense)} bold />
                  <MiniStat label="Driver Salary" value={fmt(v.salary)} />
                  <MiniStat label="Conductor Salary" value={fmt(v.conductor_salary)} />
                  <MiniStat label="Toll" value={fmt(v.toll)} />
                  <MiniStat label="Allowance" value={fmt(v.allowance)} />
                  <MiniStat label="Extra" value={fmt(v.extra)} />
                </div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Waypoints */}
      {trip.waypoints && trip.waypoints.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Route Waypoints" subtitle={`${trip.waypoints.length} stops`} />
          <CardBody className="space-y-0">
            {trip.waypoints.map((wp) => (
              <InfoRow key={wp.id} label={`Stop #${wp.order_no}`} value={`${wp.stop_name}${wp.arrival_time ? ` — ${wp.arrival_time}` : ''}`} />
            ))}
          </CardBody>
        </Card>
      )}

      {/* Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Fuel Snapshot (per bus)" />
          <CardBody className="space-y-0">
            {trip.vehicles.map((v) => (
              <InfoRow key={v.id} label={v.vehicle?.reg_no || `Bus #${v.order_no}`} value={fmt(v.fuel_expense)} />
            ))}
            <div className="border-t border-surface-border mt-3 pt-3">
              <InfoRow label="Total Fuel" value={fmt(trip.total_fuel)} bold />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Full Expense Breakdown" />
          <CardBody className="space-y-0">
            <InfoRow label="Fuel" value={fmt(trip.total_fuel)} />
            <InfoRow label="Driver Salaries" value={fmt(trip.total_driver_salary)} />
            <InfoRow label="Conductor Salaries" value={fmt(trip.total_conductor_salary)} />
            <InfoRow label="Toll" value={fmt(trip.total_toll)} />
            <InfoRow label="Allowance" value={fmt(trip.total_allowance)} />
            <InfoRow label="Extra / Misc" value={fmt(trip.total_extra)} />
            <InfoRow label={`Shift Extra (${trip.shift})`} value={fmt(trip.shift_extra || 0)} />
            <div className="border-t border-surface-border mt-3 pt-3">
              <InfoRow label="Total Expense" value={fmt(trip.total_expense)} bold />
            </div>
          </CardBody>
        </Card>
      </div>

      {trip.notes && (
        <Card className="mt-6">
          <CardHeader title="Notes" />
          <CardBody>
            <p className="text-sm text-content whitespace-pre-wrap">{trip.notes}</p>
          </CardBody>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="Final Summary" />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <SummaryStat label="Client Rent" value={fmt(trip.client_rent)} />
            <SummaryStat label="Total Expense" value={fmt(trip.total_expense)} />
            <SummaryStat label="Net Profit" value={fmt(trip.net_profit)} highlight={trip.net_profit >= 0 ? 'success' : 'danger'} />
            <SummaryStat label="Margin" value={`${trip.profit_margin_percent}%`} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function HeroCard({ label, value, color = 'brand', sub }) {
  const map = {
    brand: 'bg-brand-soft border-brand/20 text-brand-dark',
    success: 'bg-success/10 border-success/20 text-success',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    info: 'bg-info/10 border-info/20 text-info',
    danger: 'bg-danger/10 border-danger/20 text-danger',
  };
  return (
    <div className={`border rounded-xl p-5 ${map[color]}`}>
      <p className="text-sm opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  );
}

function InfoRow({ label, value, bold, capitalize }) {
  return (
    <div className="flex justify-between border-b border-surface-border py-2.5 last:border-0">
      <span className="text-sm text-content-secondary">{label}</span>
      <span className={`text-sm text-right ${bold ? 'font-semibold text-content' : 'text-content'} ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function MiniStat({ label, value, bold }) {
  return (
    <div>
      <p className="text-xs text-content-muted">{label}</p>
      <p className={`text-sm ${bold ? 'font-semibold text-content' : 'text-content'}`}>{value}</p>
    </div>
  );
}

function SummaryStat({ label, value, highlight }) {
  const cls =
    highlight === 'success' ? 'text-success'
    : highlight === 'danger' ? 'text-danger'
    : 'text-content';
  return (
    <div>
      <p className="text-xs text-content-muted uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${cls}`}>{value}</p>
    </div>
  );
}