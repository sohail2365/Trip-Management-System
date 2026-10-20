import { useEffect, useState } from 'react';
import api from '../api/client';

function Card({ label, value, color = 'brand', sub }) {
  const colorMap = {
    brand: 'bg-brand-soft border-brand/20 text-brand-dark',
    success: 'bg-success/10 border-success/20 text-success',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    danger: 'bg-danger/10 border-danger/20 text-danger',
    info: 'bg-info/10 border-info/20 text-info',
  };

  return (
    <div className={`border rounded-xl p-5 ${colorMap[color]}`}>
      <p className="text-sm opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  );
}

function Row({ label, value, capitalize }) {
  return (
    <div className="flex justify-between border-b border-surface-border py-2 last:border-0">
      <span className={`text-content-secondary ${capitalize ? 'capitalize' : ''}`}>
        {label}
      </span>
      <span className="font-medium text-content">{value}</span>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="bg-surface rounded-xl border border-surface-border p-6">
      <h2 className="font-semibold text-content mb-4">{title}</h2>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sumRes, statRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/status-counts'),
        ]);
        setSummary(sumRes.data);
        setStatusCounts(statRes.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Data load nahi ho saka');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <p className="text-content-muted">Loading...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!summary) return null;

  const fmt = (n) =>
    'PKR ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-content">Dashboard</h1>
        <p className="text-sm text-content-muted">Pooray business ka overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card label="Total Trips" value={summary.total_trips} color="brand" />
        <Card label="Total Revenue" value={fmt(summary.total_revenue)} color="info" />
        <Card label="Total Expenses" value={fmt(summary.total_expense)} color="warning" />
        <Card
          label="Net Profit"
          value={fmt(summary.total_profit)}
          color="success"
          sub={`Margin: ${summary.profit_margin_percent}%`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Expense Breakdown">
          <Row label="Fuel" value={fmt(summary.total_fuel)} />
          <Row label="Toll" value={fmt(summary.total_toll)} />
          <Row label="Salary" value={fmt(summary.total_salary)} />
          <Row label="Allowance" value={fmt(summary.total_allowance)} />
          <Row label="Extra" value={fmt(summary.total_extra)} />
        </Panel>

        <Panel title="Trip Status">
          {Object.entries(statusCounts).length === 0 && (
            <p className="text-content-muted">Koi trip nahi</p>
          )}
          {Object.entries(statusCounts).map(([status, count]) => (
            <Row key={status} label={status} value={count} capitalize />
          ))}
        </Panel>
      </div>
    </div>
  );
}