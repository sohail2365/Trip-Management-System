import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { Input } from './Input';

export default function QuickAddSelect({
  label,
  value,
  onChange,
  options,
  getOptionValue = (o) => o.id,
  getOptionLabel = (o) => o.name,
  onEntityCreated,
  createEndpoint,
  createFields,
  placeholder = '-- Select --',
  required = false,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function openAdd() {
    const initial = {};
    createFields.forEach((f) => (initial[f.key] = f.default ?? ''));
    setAddForm(initial);
    setError(null);
    setShowAdd(true);
  }

  function updateField(key, value) {
    setAddForm((p) => ({ ...p, [key]: value }));
  }

  async function saveNew(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {};
      createFields.forEach((f) => {
        let v = addForm[f.key];
        if (f.type === 'number') v = Number(v) || 0;
        payload[f.key] = v === '' ? null : v;
      });

      const { default: api } = await import('../../api/client');
      const res = await api.post(createEndpoint, payload);
      const created = res.data;

      if (onEntityCreated) onEntityCreated(created);
      onChange(String(getOptionValue(created)));
      setShowAdd(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Save nahi hua');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div>
        {label && (
          <label className="block text-xs font-medium text-content-secondary mb-1">
            {label}
          </label>
        )}
        <div className="flex gap-2">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            className="flex-1 px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
          >
            <option value="">{placeholder}</option>
            {options.map((o) => (
              <option key={getOptionValue(o)} value={getOptionValue(o)}>
                {getOptionLabel(o)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={openAdd}
            className="px-3 text-sm border border-brand text-brand rounded-lg hover:bg-brand hover:text-white transition whitespace-nowrap"
            title="Naya add karo"
          >
            + New
          </button>
        </div>
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title={`New ${label || 'Entry'}`}
        size="sm"
      >
        {/* NOTE: form → div. Nested form issue avoid karne ke liye. */}
        <div className="space-y-3">
          {createFields.map((f) => (
            <Input
              key={f.key}
              label={f.label}
              type={f.type || 'text'}
              value={addForm[f.key] ?? ''}
              onChange={(e) => updateField(f.key, e.target.value)}
              placeholder={f.placeholder || ''}
            />
          ))}

          {error && (
            <div className="px-3 py-2 rounded-lg bg-danger/10 text-danger border border-danger/20 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveNew} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Select'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}