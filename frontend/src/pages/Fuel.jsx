import { useEffect, useState } from 'react';
import api from '../api/client';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const fmt = (n) =>
  'PKR ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 2 });

export default function Fuel() {
  const [todayRate, setTodayRate] = useState(null);
  const [history, setHistory] = useState([]);
  const [rateInput, setRateInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState(null);

  const [calcDistance, setCalcDistance] = useState('');
  const [calcMileage, setCalcMileage] = useState('4');
  const [calcResult, setCalcResult] = useState(null);

  async function loadData() {
    try {
      const [todayRes, histRes] = await Promise.allSettled([
        api.get('/fuel/rate'),
        api.get('/fuel/rates'),
      ]);

      if (todayRes.status === 'fulfilled') {
        setTodayRate(todayRes.value.data);
        setRateInput(todayRes.value.data.rate_pkr);
      } else {
        setTodayRate(null);
        setRateInput('');
      }

      if (histRes.status === 'fulfilled') {
        setHistory(histRes.value.data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  async function handleSaveRate(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await api.post('/fuel/rate', {
        rate_pkr: Number(rateInput),
      });
      showMessage('success', 'Rate save ho gaya');
      await loadData();
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Save nahi hua');
    } finally {
      setSaving(false);
    }
  }

  // ─── Auto-fetch from OGRA ───
  async function handleAutoFetch(force = false) {
    setFetching(true);
    setMessage(null);

    try {
      const res = await api.post(
        `/fuel/rate/auto-fetch${force ? '?force=true' : ''}`
      );
      showMessage(
        'success',
        `OGRA se rate mil gaya: PKR ${res.data.rate_pkr}/L`
      );
      await loadData();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Fetch nahi hua';

      // Agar rate already exists error aaya — confirm karke force fetch
      if (err.response?.status === 400 && !force && todayRate) {
        const ok = window.confirm(
          `Aaj ka rate already set hai (PKR ${todayRate.rate_pkr}).\n\nOGRA se naya rate fetch karke override karna hai?`
        );
        if (ok) {
          setFetching(false);
          return handleAutoFetch(true);
        }
      } else {
        showMessage('error', detail);
      }
    } finally {
      setFetching(false);
    }
  }

  async function handleCalculate(e) {
    e.preventDefault();
    setCalcResult(null);

    try {
      const res = await api.post('/fuel/calculate', {
        distance_km: Number(calcDistance),
        mileage_kmpl: Number(calcMileage),
      });
      setCalcResult(res.data);
    } catch (err) {
      setCalcResult({
        error: err.response?.data?.detail || 'Calculate nahi hua',
      });
    }
  }

  if (loading) return <p className="text-content-muted">Loading...</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-content">Fuel Rate</h1>
        <p className="text-sm text-content-muted">
          Diesel rate manage karo aur fuel expense calculate karo
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-2 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-danger/10 text-danger border border-danger/20'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Today's Rate */}
        <Card>
          <CardHeader
            title="Aaj Ka Rate"
            subtitle={todayRate?.rate_date || 'Set nahi'}
          />
          <CardBody>
            {todayRate ? (
              <>
                <p className="text-3xl font-bold text-brand">
                  {fmt(todayRate.rate_pkr)}
                </p>
                <p className="text-xs text-content-muted mt-2 capitalize">
                  Source: {todayRate.source === 'auto' ? '🤖 Auto (OGRA)' : '✍️ Manual'}
                </p>
              </>
            ) : (
              <p className="text-sm text-content-muted">
                Aaj ka rate set nahi hai. Auto-fetch karo ya neeche manually
                daalo.
              </p>
            )}
          </CardBody>
        </Card>

        {/* Set Rate Form + Auto Fetch */}
        <Card className="lg:col-span-2">
          <CardHeader
            title={todayRate ? 'Rate Update Karo' : 'Rate Set Karo'}
            subtitle="Manual override ya OGRA se auto-fetch"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAutoFetch(false)}
                disabled={fetching}
              >
                {fetching ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    Fetching...
                  </span>
                ) : (
                  <>🤖 Fetch from OGRA</>
                )}
              </Button>
            }
          />
          <CardBody>
            <form onSubmit={handleSaveRate} className="flex gap-3 items-end">
              <div className="flex-1">
                <Input
                  label="Rate (PKR per litre) — Manual Override"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  required
                  placeholder="280.50"
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </form>

            <p className="text-xs text-content-muted mt-3">
              💡 OGRA roz auto-update karta hai (har 6 ghante check hota hai).
              Manually override karna ho to yahan se save karo.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Calculator */}
      <Card className="mb-6">
        <CardHeader
          title="Fuel Expense Calculator"
          subtitle="Distance aur mileage daal ke fuel expense nikalo"
        />
        <CardBody>
          <form
            onSubmit={handleCalculate}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
          >
            <Input
              label="Distance (KM)"
              type="number"
              step="0.1"
              min="0.1"
              value={calcDistance}
              onChange={(e) => setCalcDistance(e.target.value)}
              required
              placeholder="1200"
            />
            <Input
              label="Mileage (KM/L)"
              type="number"
              step="0.1"
              min="0.1"
              value={calcMileage}
              onChange={(e) => setCalcMileage(e.target.value)}
              required
              placeholder="4"
            />
            <Button type="submit">Calculate</Button>
          </form>

          {calcResult && (
            <div className="mt-4 p-4 rounded-lg bg-surface-bg border border-surface-border">
              {calcResult.error ? (
                <p className="text-sm text-danger">{calcResult.error}</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Stat label="Rate Used" value={fmt(calcResult.rate_pkr)} />
                  <Stat
                    label="Litres Needed"
                    value={`${calcResult.litres_needed} L`}
                  />
                  <Stat
                    label="Fuel Expense"
                    value={fmt(calcResult.fuel_expense)}
                    highlight
                  />
                  <Stat
                    label="Distance"
                    value={`${calcResult.distance_km} KM`}
                  />
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* History */}
      <Card>
        <CardHeader
          title="Rate History"
          subtitle={`Total ${history.length} records`}
        />
        <CardBody className="p-0">
          {history.length === 0 ? (
            <p className="p-5 text-sm text-content-muted">Koi history nahi</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-bg text-content-secondary text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-right px-5 py-3 font-medium">
                    Rate (PKR/L)
                  </th>
                  <th className="text-right px-5 py-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-surface-border hover:bg-surface-hover"
                  >
                    <td className="px-5 py-3 text-content">{r.rate_date}</td>
                    <td className="px-5 py-3 text-right font-medium text-content">
                      {fmt(r.rate_pkr)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${
                          r.source === 'auto'
                            ? 'bg-info/10 text-info border-info/20'
                            : 'bg-surface-bg text-content-secondary border-surface-border'
                        }`}
                      >
                        {r.source === 'auto' ? '🤖 Auto' : '✍️ Manual'}
                      </span>
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

function Stat({ label, value, highlight }) {
  return (
    <div>
      <p className="text-xs text-content-muted">{label}</p>
      <p
        className={`text-lg font-semibold mt-0.5 ${
          highlight ? 'text-brand' : 'text-content'
        }`}
      >
        {value}
      </p>
    </div>
  );
}