import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hypothesis } from '../types';
import { getHypotheses } from '../api/hypotheses';
import { HypothesisCard } from '../components/HypothesisCard';
import { FilterBar } from '../components/FilterBar';

export function Dashboard() {
  const navigate = useNavigate();
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        sort_by: sortBy,
        sort_dir: 'desc',
        page: String(page),
        limit: String(limit),
      };
      if (activeStatus !== 'all') params.status = activeStatus;
      if (search) params.search = search;
      const result = await getHypotheses(params);
      setHypotheses(result.data);
      setTotal(result.total);
    } catch (e) {
      setError('Failed to load hypotheses. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [activeStatus, search, sortBy, page]);

  useEffect(() => {
    const timer = setTimeout(fetchData, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchData, search]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#111827' }}>Hypothesis Tracker</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>{total} total hypotheses</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/wil')}
            style={{
              padding: '10px 18px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
            }}
          >
            Wil's View
          </button>
          <button
            onClick={() => navigate('/new')}
            style={{
              padding: '10px 18px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            + New Hypothesis
          </button>
        </div>
      </div>

      <FilterBar
        activeStatus={activeStatus}
        search={search}
        sortBy={sortBy}
        onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        onSearchChange={s => { setSearch(s); setPage(1); }}
        onSortChange={s => { setSortBy(s); setPage(1); }}
      />

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280', fontSize: '16px' }}>
          Loading...
        </div>
      )}

      {error && (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: '#ef4444',
          background: '#fef2f2',
          borderRadius: '8px',
          border: '1px solid #fecaca',
        }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}>
            {hypotheses.map(h => <HypothesisCard key={h.id} hypothesis={h} />)}
          </div>

          {hypotheses.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px', color: '#9ca3af', fontSize: '15px' }}>
              No hypotheses found.{' '}
              {activeStatus !== 'all' || search ? 'Try clearing filters.' : 'Create your first one!'}
            </div>
          )}

          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '32px',
              alignItems: 'center',
            }}>
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  background: page === 1 ? '#f9fafb' : 'white',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  color: page === 1 ? '#9ca3af' : '#374151',
                  fontSize: '14px',
                }}
              >
                Previous
              </button>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  background: page === totalPages ? '#f9fafb' : 'white',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  color: page === totalPages ? '#9ca3af' : '#374151',
                  fontSize: '14px',
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
