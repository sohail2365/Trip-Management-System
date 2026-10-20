const variants = {
    scheduled: 'bg-info/10 text-info border-info/20',
    ongoing: 'bg-warning/10 text-warning border-warning/20',
    completed: 'bg-success/10 text-success border-success/20',
    cancelled: 'bg-danger/10 text-danger border-danger/20',
    default: 'bg-surface-bg text-content-secondary border-surface-border',
  };
  
  export default function Badge({ status }) {
    const cls = variants[status] || variants.default;
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${cls}`}
      >
        {status}
      </span>
    );
  }