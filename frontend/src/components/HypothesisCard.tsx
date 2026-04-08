import { useNavigate } from 'react-router-dom';
import { Hypothesis } from '../types';
import { StatusBadge } from './StatusBadge';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function HypothesisCard({ hypothesis }: { hypothesis: Hypothesis }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/hypothesis/${hypothesis.id}`)}
      style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827', flex: 1, marginRight: '12px' }}>
          {hypothesis.title}
        </h3>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          {hypothesis.category && (
            <span style={{
              background: '#f3f4f6',
              color: '#374151',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'capitalize',
            }}>
              {hypothesis.category.replace('_', ' ').replace('bd gtm', 'BD/GTM')}
            </span>
          )}
          <StatusBadge status={hypothesis.status} />
        </div>
      </div>
      {hypothesis.description && (
        <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: '13px', lineHeight: '1.5' }}>
          {hypothesis.description.length > 120 ? hypothesis.description.slice(0, 120) + '...' : hypothesis.description}
        </p>
      )}
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#9ca3af' }}>
        <span>Priority: {hypothesis.priority}/10</span>
        {hypothesis.original_proposer && <span>By: {hypothesis.original_proposer}</span>}
        <span>{formatDate(hypothesis.created_at)}</span>
        <span style={{ textTransform: 'capitalize' }}>{hypothesis.source?.replace('_', ' ')}</span>
      </div>
    </div>
  );
}
