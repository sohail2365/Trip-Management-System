export default function Card({ children, className = '' }) {
    return (
      <div className={`bg-surface rounded-xl border border-surface-border ${className}`}>
        {children}
      </div>
    );
  }
  
  export function CardHeader({ title, subtitle, action }) {
    return (
      <div className="flex items-start justify-between p-5 border-b border-surface-border">
        <div>
          <h2 className="font-semibold text-content">{title}</h2>
          {subtitle && (
            <p className="text-xs text-content-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
    );
  }
  
  export function CardBody({ children, className = '' }) {
    return <div className={`p-5 ${className}`}>{children}</div>;
  }