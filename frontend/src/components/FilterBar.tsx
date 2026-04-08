import { Status } from '../types';

const STATUSES: (Status | 'all')[] = ['all', 'new', 'in_progress', 'backburner', 'complete', 'archived'];

interface FilterBarProps {
  activeStatus: string;
  search: string;
  sortBy: string;
  onStatusChange: (s: string) => void;
  onSearchChange: (s: string) => void;
  onSortChange: (s: string) => void;
}

export function FilterBar({ activeStatus, search, sortBy, onStatusChange, onSearchChange, onSortChange }: FilterBarProps) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        type="text"
        placeholder="Search hypotheses..."
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        style={{
          padding: '8px 12px',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          fontSize: '14px',
          width: '220px',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            style={{
              padding: '6px 14px',
              border: '1px solid',
              borderColor: activeStatus === s ? '#3b82f6' : '#e5e7eb',
              borderRadius: '9999px',
              background: activeStatus === s ? '#3b82f6' : 'white',
              color: activeStatus === s ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              textTransform: 'capitalize',
            }}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>
      <select
        value={sortBy}
        onChange={e => onSortChange(e.target.value)}
        style={{
          padding: '8px 12px',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          fontSize: '14px',
          background: 'white',
          cursor: 'pointer',
        }}
      >
        <option value="created_at">Newest first</option>
        <option value="updated_at">Recently updated</option>
        <option value="priority">Priority</option>
      </select>
    </div>
  );
}
