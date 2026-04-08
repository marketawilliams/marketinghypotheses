import { Status } from '../types';

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  new: { label: 'New', color: '#3b82f6' },
  in_progress: { label: 'In Progress', color: '#f59e0b' },
  backburner: { label: 'Backburner', color: '#6b7280' },
  complete: { label: 'Complete', color: '#10b981' },
  archived: { label: 'Archived', color: '#d1d5db' },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span style={{
      backgroundColor: config.color,
      color: status === 'archived' ? '#374151' : 'white',
      padding: '2px 10px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: 600,
      display: 'inline-block',
    }}>
      {config.label}
    </span>
  );
}
