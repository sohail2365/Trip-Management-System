import { useRef } from 'react';

export default function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  step = '1',
  required = false,
  placeholder = '0',
  error,
  className = '',
}) {
  const inputRef = useRef(null);

  function handleFocus(e) {
    if (e.target.value === '0') {
      e.target.select();
    }
  }

  function handleChange(e) {
    const v = e.target.value;
    if (v === '' || /^\d*\.?\d*$/.test(v)) {
      onChange(v);
    }
  }

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-content-secondary mb-1">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        required={required}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm bg-surface border rounded-lg text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition ${
          error ? 'border-danger' : 'border-surface-border'
        } ${className}`}
      />
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}