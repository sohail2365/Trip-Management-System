import { useEffect, useState } from 'react';
import { Input } from './Input';

export default function PhoneField({
  label,
  primaryValue,
  altValue,
  onPrimaryChange,
  onAltChange,
  required = false,
}) {
  const [showAlt, setShowAlt] = useState(Boolean(altValue));

  useEffect(() => {
    if (altValue) setShowAlt(true);
  }, [altValue]);

  return (
    <div>
      <Input
        label={label}
        value={primaryValue}
        onChange={(e) => onPrimaryChange(e.target.value)}
        required={required}
        placeholder="0300-1234567"
      />

      {!showAlt ? (
        <button
          type="button"
          onClick={() => setShowAlt(true)}
          className="text-xs text-brand hover:underline mt-2"
        >
          + Add alternate number
        </button>
      ) : (
        <div className="mt-3">
          <Input
            label={`${label} (alternate)`}
            value={altValue}
            onChange={(e) => onAltChange(e.target.value)}
            placeholder="0300-7654321"
          />
          <button
            type="button"
            onClick={() => {
              setShowAlt(false);
              onAltChange('');
            }}
            className="text-xs text-danger hover:underline mt-2"
          >
            Remove alternate
          </button>
        </div>
      )}
    </div>
  );
}