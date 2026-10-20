import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const fmt = (n) =>
  'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

const fmt2 = (n) =>
  Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });

const firstOfYear = () => {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fromDate, setFromDate] = useState(firstOfYear());
  const [toDate, setToDate] = useState(today());

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/vehicles/${id}/detail`, {
        params: { from_date: fromDate, to_date: toDate },
      });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Vehicle load nahi hui');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <p className="text-content-muted p-6">Loading...</p>;
  if (error) return <p className="text-danger p-6">{error}</p>;
  if (!data) return null;

  const { vehicle, totals, trips, maintenance } = data;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              to="/vehicles"
              className="text-content-muted hover:text-content text-sm"
            >
              ← Vehicles
            </Link>
            <span className="text-content-muted">/</span>
            <span className="text-content text-sm font-medium">
              {vehicle.reg_no}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-content">
            🚐 {vehicle.reg_no}
          </h1>
          <p className="text-sm text-content-muted mt-1">
            {vehicle.model}
            {vehicle.diary_number && (
              <span className="ml-2 text-content-secondary">
                • Diary: {vehicle.diary_number}
              </span>
            )}
            <span className="ml-2">• {vehicle.mileage_kmpl} KM/L</span>
          </p>
        </div>

        <Button variant="secondary" onClick={() => navigate('/vehicles')}>
          Close
        </Button>
      </div>

      {/* Date Filter */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
            <Button onClick={load} disabled={loading}>
              {loading ? 'Loading...' : 'Apply Filter'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="Total Trips"
          value={totals.total_trips}
          color="brand"
        />
        <SummaryCard
          label="Revenue Share"
          value={fmt(totals.revenue_share)}
          color="info"
          sub="(proportional to buses per trip)"
        />
        <SummaryCard
          label="Total Expense"
          value={fmt(totals.total_expense)}
          color="warning"
        />
        <SummaryCard
          label="Net Profit"
          value={fmt(totals.net_profit)}
          color={totals.net_profit >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader
            title="Expense Breakdown"
            subtitle="Is vehicle ke khud ke expenses"
          />
          <CardBody className="space-y-0">
            <InfoRow label="Fuel" value={fmt(totals.total_fuel)} />
            <InfoRow label="Toll" value={fmt(totals.total_toll)} />
            <InfoRow
              label="Driver Salaries"
              value={fmt(totals.total_driver_salary)}
            />
            <InfoRow
              label="Conductor Salaries"
              value={fmt(totals.total_conductor_salary)}
            />
            <InfoRow label="Allowance" value={fmt(totals.total_allowance)} />
            <InfoRow label="Extra" value={fmt(totals.total_extra)} />
            <InfoRow
              label="Maintenance"
              value={fmt(totals.total_maintenance)}
            />
            <div className="border-t border-surface-border mt-3 pt-3">
              <InfoRow
                label="Total Expense"
                value={fmt(totals.total_expense)}
                bold
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Performance"
            subtitle="Business metrics"
          />
          <CardBody className="space-y-0">
            <InfoRow
              label="Total Distance"
              value={`${totals.total_distance_km} KM`}
            />
            <InfoRow
              label="Revenue Share"
              value={fmt(totals.revenue_share)}
              bold
            />
            <InfoRow
              label="Total Expense"
              value={fmt(totals.total_expense)}
            />
            <InfoRow
              label="Net Profit"
              value={fmt(totals.net_profit)}
              bold
            />
            <InfoRow
              label="Avg Profit / Trip"
              value={
                totals.total_trips > 0
                  ? fmt(totals.net_profit / totals.total_trips)
                  : '—'
              }
            />
          </CardBody>
        </Card>
      </div>

      {/* Trip History */}
      <Card className="mb-6">
        <CardHeader
          title="Trip History"
          subtitle={`${trips.length} trips is period mein`}
        />
        <CardBody className="p-0">
          {trips.length === 0 ? (
            <p className="p-6 text-sm text-content-muted">
              Is period mein koi trip nahi.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-bg text-content-secondary text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Trip</th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Route</th>
                    <th className="text-left px-4 py-3 font-medium">Client</th>
                    <th className="text-right px-4 py-3 font-medium">
                      Trip Rent
                    </th>
                    <th className="text-right px-4 py-3 font-medium">Share</th>
                    <th className="text-right px-4 py-3 font-medium">
                      Own Expense
                    </th>
                    <th className="text-right px-4 py-3 font-medium">
                      Net
                    </th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((t) => (
                    <tr
                      key={t.trip_id}
                      className="border-t border-surface-border hover:bg-surface-hover"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/trips/${t.trip_id}`}
                          className="text-brand hover:underline font-medium"
                        >
                          #{t.trip_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-content-secondary">
                        {t.travel_date}
                        {t.travel_day && (
                          <span className="block text-xs text-content-muted">
                            {t.travel_day}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-content">
                        {t.source} → {t.destination}
                        {t.is_round_trip && (
                          <span className="ml-1 text-xs text-brand">🔄</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-content-secondary">
                        {t.client_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-content-secondary">
                        {fmt(t.trip_client_rent)}
                        {t.vehicle_count > 1 && (
                          <span className="block text-xs text-content-muted">
                            ÷ {t.vehicle_count} buses
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-info">
                        {fmt(t.revenue_share)}
                      </td>
                      <td className="px-4 py-3 text-right text-content-muted">
                        {fmt(t.own_expense)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          t.own_profit >= 0 ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {fmt(t.own_profit)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={t.trip_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Maintenance History */}
      <Card>
        <CardHeader
          title="Maintenance History"
          subtitle={`${maintenance.length} entries`}
        />
        <CardBody className="p-0">
          {maintenance.length === 0 ? (
            <p className="p-6 text-sm text-content-muted">
              Koi maintenance record nahi.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-bg text-content-secondary text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-left px-5 py-3 font-medium">Type</th>
                  <th className="text-left px-5 py-3 font-medium">
                    Description
                  </th>
                  <th className="text-left px-5 py-3 font-medium">Vendor</th>
                  <th className="text-right px-5 py-3 font-medium">
                    Odometer
                  </th>
                  <th className="text-right px-5 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {maintenance.map((m) => (
                  <tr
                    key={m.id}
                    className="border-t border-surface-border hover:bg-surface-hover"
                  >
                    <td className="px-5 py-3 text-content-secondary">
                      {m.date}
                    </td>
                    <td className="px-5 py-3 text-content capitalize">
                      {m.type}
                    </td>
                    <td className="px-5 py-3 text-content-secondary">
                      {m.description || '—'}
                    </td>
                    <td className="px-5 py-3 text-content-secondary">
                      {m.vendor || '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-content-muted">
                      {m.odometer_km ? `${m.odometer_km} KM` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-content">
                      {fmt(m.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, color = 'brand', sub }) {
  const map = {
    brand: 'bg-brand-soft border-brand/20 text-brand-dark',
    success: 'bg-success/10 border-success/20 text-success',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    info: 'bg-info/10 border-info/20 text-info',
    danger: 'bg-danger/10 border-danger/20 text-danger',
  };
  return (
    <div className={`border rounded-xl p-4 ${map[color]}`}>
      <p className="text-xs uppercase tracking-wide opacity-75">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

function InfoRow({ label, value, bold }) {
  return (
    <div className="flex justify-between border-b border-surface-border py-2.5 last:border-0">
      <span className="text-sm text-content-secondary">{label}</span>
      <span
        className={`text-sm text-right ${
          bold ? 'font-semibold text-content' : 'text-content'
        }`}
      >
        {value}
      </span>
    </div>
  );
}