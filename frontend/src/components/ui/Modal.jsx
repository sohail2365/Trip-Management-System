export default function Modal({ open, onClose, title, children, size = 'md' }) {
    if (!open) return null;
  
    const sizes = {
      sm: 'max-w-md',
      md: 'max-w-2xl',
      lg: 'max-w-4xl',
      xl: 'max-w-6xl',
    };
  
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className={`bg-surface rounded-xl border border-surface-border shadow-xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 border-b border-surface-border">
            <h2 className="font-semibold text-content">{title}</h2>
            <button
              onClick={onClose}
              className="text-content-muted hover:text-content text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="p-5 overflow-auto flex-1">{children}</div>
        </div>
      </div>
    );
  }