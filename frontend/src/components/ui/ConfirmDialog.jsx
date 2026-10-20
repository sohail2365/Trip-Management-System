import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open,
  title = 'Confirm?',
  message,
  confirmLabel = 'Delete',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-sm text-content-secondary mb-4">{message}</p>
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant={variant} onClick={onConfirm} disabled={loading}>
          {loading ? 'Working...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}