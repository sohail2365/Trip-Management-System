export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    onClick,
    className = '',
  }) {
    const variants = {
      primary:
        'bg-brand text-white hover:bg-brand-dark disabled:bg-brand/50',
      secondary:
        'bg-surface border border-surface-border text-content hover:bg-surface-hover',
      danger:
        'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50',
      ghost:
        'text-content-secondary hover:bg-surface-hover',
    };
  
    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-2.5 text-base',
    };
  
    return (
      <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={`rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      >
        {children}
      </button>
    );
  }