import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hypothesis } from '../types';
import { getHypotheses } from '../api/hypotheses';
import { StatusBadge } from '../components/StatusBadge';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function WilView() {
  const navigate = useNavigate();
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Fetch all hypotheses (multiple pages if needed) and filter client-side
    getHypotheses({ limit: '200', sort_by: 'created_at', sort_dir: 'desc' })
      .then(result => {
        const wilHypotheses = result.data.filter(h =>
          h.original_proposer?.toLowerCase().includes('wil')
        );
        setHypotheses(wilHypotheses);
      })
      .catch(() => setError('Failed to load hypotheses. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#3b82f6',
            fontSize: '14px',
            padding: 0,
            marginBottom: '16px',
            display: 'inline-block',
          }}
        >
          ← Back to Dashboard
        </button>
        <h1 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: 700, color: '#111827' }}>
          Wil's Hypotheses
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
          {loading ? 'Loading...' : `${hypotheses.length} hypothesis${hypotheses.length !== 1 ? 'es' : ''} proposed by Wil`}
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
          Loading...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: '#ef4444',
          background: '#fef2f2',
          borderRadius: '8px',
          border: '1px solid #fecaca',
        }}>
          {error}
        </div>
      )}

      {/* List */}
      {!loading && !error && (
        <>
          {hypotheses.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '64px',
              color: '#9ca3af',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              fontSize: '15px',
            }}>
              No hypotheses found from Wil yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {hypotheses.map(h => (
                <div
                  key={h.id}
                  onClick={() => navigate(`/hypothesis/${h.id}`)}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '20px 24px',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.15s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)')}
                >
                  {/* Title row */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '10px',
                    gap: '12px',
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#111827',
                      flex: 1,
                    }}>
                      {h.title}
                    </h3>
                    <StatusBadge status={h.status} />
                  </div>

                  {/* Meta row */}
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '12px',
                    color: '#9ca3af',
                    marginBottom: h.notes ? '12px' : '0',
                    flexWrap: 'wrap',
                  }}>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      Priority:{' '}
                      <span style={{
                        color: h.priority >= 8 ? '#ef4444' : h.priority >= 5 ? '#f59e0b' : '#10b981',
                        fontWeight: 600,
                        fontSize: '13px',
                      }}>
                        {h.priority}/10
                      </span>
                    </span>
                    <span>{formatDate(h.created_at)}</span>
                    <span style={{ textTransform: 'capitalize' }}>
                      {h.source?.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Notes */}
                  {h.notes && (
                    <div style={{
                      padding: '10px 14px',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#78350f',
                      lineHeight: '1.5',
                    }}>
                      <span style={{ fontWeight: 600, marginRight: '6px' }}>Notes:</span>
                      {h.notes.length > 200 ? h.notes.slice(0, 200) + '...' : h.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
