import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HypothesisDetail as HypothesisDetailType, Status } from '../types';
import { getHypothesis, updateHypothesis } from '../api/hypotheses';
import { StatusBadge } from '../components/StatusBadge';

const STATUSES: Status[] = ['new', 'in_progress', 'backburner', 'complete', 'archived'];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [hypothesis, setHypothesis] = useState<HypothesisDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Editable fields
  const [status, setStatus] = useState<Status>('new');
  const [priority, setPriority] = useState(5);
  const [notes, setNotes] = useState('');
  const [description, setDescription] = useState('');
  const [updatedBy, setUpdatedBy] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getHypothesis(id)
      .then(data => {
        setHypothesis(data);
        setStatus(data.status);
        setPriority(data.priority ?? 5);
        setNotes(data.notes ?? '');
        setDescription(data.description ?? '');
      })
      .catch(() => setError('Failed to load hypothesis.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await updateHypothesis(id, {
        status,
        priority,
        notes,
        description,
        updated_by: updatedBy || 'frontend-user',
      });
      setHypothesis(prev => prev ? { ...prev, ...updated } : null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px', textAlign: 'center', color: '#6b7280' }}>
        Loading...
      </div>
    );
  }

  if (error || !hypothesis) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: '14px', padding: 0, marginBottom: '24px' }}
        >
          ← Back to Dashboard
        </button>
        <div style={{ textAlign: 'center', padding: '48px', color: '#ef4444' }}>
          {error || 'Hypothesis not found.'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#3b82f6',
          fontSize: '14px',
          padding: 0,
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        ← Back to Dashboard
      </button>

      {/* Header */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '28px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#111827', flex: 1, marginRight: '16px' }}>
            {hypothesis.title}
          </h1>
          <StatusBadge status={hypothesis.status} />
        </div>

        <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#6b7280', flexWrap: 'wrap' }}>
          {hypothesis.original_proposer && (
            <span>Proposed by: <strong style={{ color: '#374151' }}>{hypothesis.original_proposer}</strong></span>
          )}
          <span>Source: <strong style={{ color: '#374151', textTransform: 'capitalize' }}>{hypothesis.source?.replace('_', ' ')}</strong></span>
          <span>Created: <strong style={{ color: '#374151' }}>{formatDate(hypothesis.created_at)}</strong></span>
          <span>Updated: <strong style={{ color: '#374151' }}>{formatDate(hypothesis.updated_at)}</strong></span>
        </div>

        {hypothesis.tagged_people && hypothesis.tagged_people.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Tagged:</span>
            {hypothesis.tagged_people.map((person, i) => (
              <span key={i} style={{
                background: '#eff6ff',
                color: '#3b82f6',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 500,
              }}>
                {person}
              </span>
            ))}
          </div>
        )}

        {hypothesis.slack_thread_url && (
          <div style={{ marginTop: '12px' }}>
            <a
              href={hypothesis.slack_thread_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#3b82f6', fontSize: '13px', textDecoration: 'none' }}
            >
              View Slack Thread →
            </a>
          </div>
        )}
      </div>

      {/* Edit Panel */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '28px',
        marginBottom: '20px',
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: '#111827' }}>Edit</h2>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              color: '#111827',
            }}
          />
        </div>

        {/* Status */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            Status
          </label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as Status)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'white',
              cursor: 'pointer',
              color: '#111827',
              outline: 'none',
            }}
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>
                {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            Priority: <span style={{ color: '#3b82f6', fontWeight: 700 }}>{priority}</span>/10
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={priority}
            onChange={e => setPriority(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
            <span>1 (Low)</span>
            <span>10 (High)</span>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={5}
            placeholder="Add notes, observations, or context..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              color: '#111827',
            }}
          />
        </div>

        {/* Updated By */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            Your name (for change log)
          </label>
          <input
            type="text"
            value={updatedBy}
            onChange={e => setUpdatedBy(e.target.value)}
            placeholder="e.g. Wil"
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              width: '200px',
              outline: 'none',
              color: '#111827',
            }}
          />
        </div>

        {/* Save button & feedback */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px',
              background: saving ? '#93c5fd' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && (
            <span style={{ color: '#10b981', fontSize: '14px', fontWeight: 500 }}>
              Saved!
            </span>
          )}
          {saveError && (
            <span style={{ color: '#ef4444', fontSize: '14px' }}>
              {saveError}
            </span>
          )}
        </div>
      </div>

      {/* Raw Transcript */}
      {hypothesis.raw_transcript && (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '28px',
          marginBottom: '20px',
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#111827' }}>Raw Transcript</h2>
          <pre style={{
            margin: 0,
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#374151',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            border: '1px solid #e5e7eb',
            maxHeight: '300px',
            overflowY: 'auto',
          }}>
            {hypothesis.raw_transcript}
          </pre>
        </div>
      )}

      {/* Update History */}
      {hypothesis.history && hypothesis.history.length > 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '28px',
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
            Update History ({hypothesis.history.length})
          </h2>
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute',
              left: '7px',
              top: '8px',
              bottom: '8px',
              width: '2px',
              background: '#e5e7eb',
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {hypothesis.history.map((update, i) => (
                <div key={update.id ?? i} style={{ display: 'flex', gap: '20px', paddingBottom: '20px', position: 'relative' }}>
                  {/* Dot */}
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#3b82f6',
                    border: '2px solid white',
                    boxShadow: '0 0 0 2px #3b82f6',
                    flexShrink: 0,
                    marginTop: '2px',
                    zIndex: 1,
                  }} />
                  <div style={{ flex: 1, paddingBottom: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{
                        background: '#eff6ff',
                        color: '#3b82f6',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}>
                        {update.update_type?.replace('_', ' ')}
                      </span>
                      {update.updated_by && (
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                          {update.updated_by}
                        </span>
                      )}
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {formatDateTime(update.timestamp)}
                      </span>
                    </div>
                    {(update.old_value || update.new_value) && (
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {update.old_value && (
                          <span style={{ textDecoration: 'line-through', marginRight: '8px', color: '#9ca3af' }}>
                            {update.old_value}
                          </span>
                        )}
                        {update.new_value && (
                          <span style={{ color: '#374151', fontWeight: 500 }}>
                            {update.new_value}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(!hypothesis.history || hypothesis.history.length === 0) && (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '28px',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '14px',
        }}>
          No update history yet.
        </div>
      )}
    </div>
  );
}
