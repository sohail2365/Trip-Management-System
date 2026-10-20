export default function Spinner({ label = 'Loading...', size = 'md' }) {
    const sizes = {
      sm: 'w-4 h-4 border-2',
      md: 'w-6 h-6 border-2',
      lg: 'w-8 h-8 border-[3px]',
    };
  
    return (
      <div className="flex items-center justify-center gap-3 p-8">
        <div
          className={`${sizes[size]} border-surface-border border-t-brand rounded-full animate-spin`}
        />
        {label && <span className="text-sm text-content-muted">{label}</span>}
      </div>
    );
  }