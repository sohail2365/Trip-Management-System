import { useEffect, useState } from 'react';
import api from '../api/client';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';

const fmt = (n) =>
  'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

const today = () => new Date().toISOString().slice(0, 10);

function firstOfYear() {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}

export default function Reports() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [fromDate, setFromDate] = useState(firstOfYear());
  const [toDate, setToDate] = useState(today());
  const [groupBy, setGroupBy] = useState('month');

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/vehicles').then((r) => {
      setVehicles(r.data);
      if (r.data.length) setVehicleId(String(r.data[0].id));
    }).catch(() => {});
  }, []);

  async function generate() {
    if (!vehicleId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/reports/vehicle/${vehicleId}`, {
        params: { from_date: fromDate, to_date: toDate, group_by: groupBy },
      });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Report nahi bani');
      setReport(null);
    } finally { setLoading(false); }
  }

  // Auto-generate when vehicle picked first time
  useEffect(() => {
    if (vehicleId) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-content">Reports</h1>
        <p className="text-sm text-content-muted">Vehicle-wise earnings aur expenses</p>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <Select
              label="Vehicle"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">-- Select --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.reg_no} {v.diary_number ? `(${v.diary_number})` : ''}
                </option>
              ))}
            </Select>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">From</label>
              <input
                type="date" value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">To</label>
              <input
                type="date" value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>

            <Select label="Group By" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </Select>

            <Button onClick={generate} disabled={loading || !vehicleId}>
              {loading ? 'Loading...' : 'Generate'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-danger/10 text-danger border border-danger/20 text-sm">
          {error}
        </div>
      )}

      {loading && <Spinner label="Report generate ho rahi hai..." />}

      {report && !loading && (
        <>
          {/* Vehicle header */}
          <Card className="mb-6">
            <CardBody>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-content">
                    {report.reg_no}
                    {report.diary_number && (
                      <span className="ml-2 text-sm font-normal text-content-muted">
                        Diary: {report.diary_number}
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-content-muted">{report.model}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-content-muted uppercase tracking-wide">
                    Period
                  </p>
                  <p className="text-sm font-medium text-content">
                    {fromDate} → {toDate}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Grand totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Trips" value={report.total_trips} />
            <StatCard label="Distance" value={`${report.total_distance_km} KM`} />
            <StatCard label="Earnings" value={fmt(report.total_earnings)} color="info" />
            <StatCard
              label="Net Profit"
              value={fmt(report.total_profit)}
              color={report.total_profit >= 0 ? 'success' : 'danger'}
              sub={`Margin: ${report.profit_margin_percent}%`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Fuel Expense" value={fmt(report.total_fuel)} color="warning" />
            <StatCard label="Other Expenses" value={fmt(report.total_other_expenses)} color="warning" />
            <StatCard label="Maintenance" value={fmt(report.total_maintenance)} color="danger" />
          </div>

          {/* Period breakdown */}
          <Card>
            <CardHeader
              title="Breakdown"
              subtitle={`${report.periods.length} periods`}
            />
            <CardBody className="p-0">
              {report.periods.length === 0 ? (
                <p className="p-6 text-sm text-content-muted">
                  Is period mein koi activity nahi.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-surface-bg text-content-secondary text-xs uppercase">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium">Period</th>
                      <th className="text-right px-5 py-3 font-medium">Trips</th>
                      <th className="text-right px-5 py-3 font-medium">KM</th>
                      <th className="text-right px-5 py-3 font-medium">Earnings</th>
                      <th className="text-right px-5 py-3 font-medium">Fuel</th>
                      <th className="text-right px-5 py-3 font-medium">Other</th>
                      <th className="text-right px-5 py-3 font-medium">Maint.</th>
                      <th className="text-right px-5 py-3 font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.periods.map((p, i) => (
                      <tr key={i} className="border-t border-surface-border hover:bg-surface-hover">
                        <td className="px-5 py-3 text-content font-medium">{p.label}</td>
                        <td className="px-5 py-3 text-right text-content-secondary">{p.trips}</td>
                        <td className="px-5 py-3 text-right text-content-secondary">{p.distance_km}</td>
                        <td className="px-5 py-3 text-right text-content">{fmt(p.earnings)}</td>
                        <td className="px-5 py-3 text-right text-content-muted">{fmt(p.fuel_expense)}</td>
                        <td className="px-5 py-3 text-right text-content-muted">{fmt(p.other_expenses)}</td>
                        <td className="px-5 py-3 text-right text-content-muted">{fmt(p.maintenance)}</td>
                        <td className={`px-5 py-3 text-right font-semibold ${p.net_profit >= 0 ? 'text-success' : 'text-danger'}`}>
                          {fmt(p.net_profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {!report && !loading && vehicleId && (
        <p className="text-content-muted text-sm text-center py-10">
          "Generate" dabao report dekhne ke liye.
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'brand', sub }) {
  const map = {
    brand: 'bg-brand-soft border-brand/20 text-brand-dark',
    success: 'bg-success/10 border-success/20 text-success',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    info: 'bg-info/10 border-info/20 text-info',
    danger: 'bg-danger/10 border-danger/20 text-danger',
  };
  return (
    <div className={`border rounded-xl p-4 ${map[color]}`}>
      <p className="text-xs opacity-75 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}