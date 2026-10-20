import { useEffect, useState } from 'react';
import api from '../api/client';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Settings() {
  const [form, setForm] = useState({
    bus_service_name: '',
    owner_name: '',
    owner_phone_1: '',
    owner_phone_2: '',
    receipt_footer_text: '',
    address: '',
    day_shift_extra: '0',
    night_shift_extra: '0',
  });
  const [showPhone2, setShowPhone2] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/settings');
        setForm({
          bus_service_name: res.data.bus_service_name || '',
          owner_name: res.data.owner_name || '',
          owner_phone_1: res.data.owner_phone_1 || '',
          owner_phone_2: res.data.owner_phone_2 || '',
          receipt_footer_text: res.data.receipt_footer_text || '',
          address: res.data.address || '',
          day_shift_extra: String(res.data.day_shift_extra ?? 0),
          night_shift_extra: String(res.data.night_shift_extra ?? 0),
        });
        if (res.data.owner_phone_2) setShowPhone2(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function update(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/settings', {
        ...form,
        day_shift_extra: Number(form.day_shift_extra) || 0,
        night_shift_extra: Number(form.night_shift_extra) || 0,
        owner_phone_2: form.owner_phone_2 || null,
        receipt_footer_text: form.receipt_footer_text || null,
        address: form.address || null,
      });
      setMessage({ type: 'success', text: 'Settings save ho gayin' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Save nahi hua',
      });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  if (loading) return <p className="text-content-muted">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-content">Settings</h1>
        <p className="text-sm text-content-muted">
          Company aur receipt ki information
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

      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardHeader title="Bus Service" subtitle="Receipt header par dikhega" />
          <CardBody className="space-y-4">
            <Input
              label="Bus Service Name"
              value={form.bus_service_name}
              onChange={(e) => update('bus_service_name', e.target.value)}
              placeholder="e.g. Al-Madina Travels"
            />
            <Input
              label="Address (optional)"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="e.g. Bus Stand, Lahore"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Owner Information" />
          <CardBody className="space-y-4">
            <Input
              label="Owner Name"
              value={form.owner_name}
              onChange={(e) => update('owner_name', e.target.value)}
              placeholder="e.g. Muhammad Ahmed"
            />

            <div>
              <Input
                label="Owner Phone 1"
                value={form.owner_phone_1}
                onChange={(e) => update('owner_phone_1', e.target.value)}
                placeholder="0300-1234567"
              />
              {!showPhone2 ? (
                <button
                  type="button"
                  onClick={() => setShowPhone2(true)}
                  className="text-xs text-brand hover:underline mt-2"
                >
                  + Add alternate phone number
                </button>
              ) : (
                <div className="mt-3">
                  <Input
                    label="Owner Phone 2 (alternate)"
                    value={form.owner_phone_2}
                    onChange={(e) => update('owner_phone_2', e.target.value)}
                    placeholder="0300-7654321"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowPhone2(false);
                      update('owner_phone_2', '');
                    }}
                    className="text-xs text-danger hover:underline mt-2"
                  >
                    Remove alternate
                  </button>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Shift Extra Charges"
            subtitle="Trip form mein shift select karne par ye auto-fill honge"
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Day Shift Extra (PKR)"
                type="number"
                min="0"
                value={form.day_shift_extra}
                onChange={(e) => update('day_shift_extra', e.target.value)}
                placeholder="0"
              />
              <Input
                label="Night Shift Extra (PKR)"
                type="number"
                min="0"
                value={form.night_shift_extra}
                onChange={(e) => update('night_shift_extra', e.target.value)}
                placeholder="0"
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Receipt Footer"
            subtitle="Receipt ke aakhir mein ye text print hoga"
          />
          <CardBody className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                Footer Text (Urdu ya English)
              </label>
              <textarea
                value={form.receipt_footer_text}
                onChange={(e) => update('receipt_footer_text', e.target.value)}
                rows={5}
                dir="auto"
                placeholder="Receipt ke neeche ye text print hoga..."
                className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
              />
              <p className="text-xs text-content-muted mt-1">
                Urdu likhne ke liye seedha yahan type karo — RTL support hai.
              </p>
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}