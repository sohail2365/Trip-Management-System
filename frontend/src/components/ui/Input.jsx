export function Input({ label, error, ...props }) {
    return (
      <div>
        {label && (
          <label className="block text-xs font-medium text-content-secondary mb-1">
            {label}
          </label>
        )}
        <input
          {...props}
          className={`w-full px-3 py-2 text-sm bg-surface border rounded-lg text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition ${
            error ? 'border-danger' : 'border-surface-border'
          } ${props.className || ''}`}
        />
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
    );
  }
  
  export function Select({ label, error, children, ...props }) {
    return (
      <div>
        {label && (
          <label className="block text-xs font-medium text-content-secondary mb-1">
            {label}
          </label>
        )}
        <select
          {...props}
          className={`w-full px-3 py-2 text-sm bg-surface border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition ${
            error ? 'border-danger' : 'border-surface-border'
          } ${props.className || ''}`}
        >
          {children}
        </select>
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
    );
  }