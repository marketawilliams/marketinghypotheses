import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createHypothesis } from '../api/hypotheses';
import { Category } from '../types';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'social', label: 'Social' },
  { value: 'website', label: 'Website' },
  { value: 'bd_gtm', label: 'BD / GTM' },
  { value: 'other', label: 'Other' },
];

export function NewHypothesis() {
  const navigate = useNavigate();

  const [rawText, setRawText] = useState('');
  const [originalProposer, setOriginalProposer] = useState('');
  const [priority, setPriority] = useState(5);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<Category | ''>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawTextError, setRawTextError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rawText.trim()) {
      setRawTextError('Please describe the hypothesis.');
      return;
    }
    setRawTextError(null);
    setSubmitting(true);
    setError(null);

    try {
      const newHypothesis = await createHypothesis({
        raw_text: rawText.trim(),
        original_proposer: originalProposer.trim(),
        priority,
        notes: notes.trim(),
        category: category || undefined,
      } as Parameters<typeof createHypothesis>[0]);
      navigate(`/hypothesis/${newHypothesis.id}`);
    } catch {
      setError('Failed to create hypothesis. Is the backend running?');
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    color: '#111827',
    background: 'white',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px',
  };

  const fieldStyle: React.CSSProperties = { marginBottom: '20px' };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 24px' }}>
      <button
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: '14px', padding: 0, marginBottom: '24px', display: 'inline-block' }}
      >
        ← Back to Dashboard
      </button>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: 700, color: '#111827' }}>New Hypothesis</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
          Describe the idea in plain language — Claude will structure it for you.
        </p>
      </div>

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '28px' }}>
        <form onSubmit={handleSubmit} noValidate>

          {/* Raw idea */}
          <div style={fieldStyle}>
            <label style={labelStyle}>
              What's the idea or hypothesis? <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={rawText}
              onChange={e => { setRawText(e.target.value); if (rawTextError) setRawTextError(null); }}
              rows={5}
              placeholder="e.g. I think adding a testimonials page will help us rank better in AI search results and get more brand mentions..."
              style={{ ...inputStyle, resize: 'vertical', borderColor: rawTextError ? '#ef4444' : '#e5e7eb' }}
            />
            {rawTextError && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444' }}>{rawTextError}</p>}
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#9ca3af' }}>
              Write it the way you'd say it in Slack. Claude will extract the title and structure.
            </p>
          </div>

          {/* Proposed by */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Proposed by</label>
            <input
              type="text"
              value={originalProposer}
              onChange={e => setOriginalProposer(e.target.value)}
              placeholder="e.g. Wil, Sarah, Marketing team"
              style={inputStyle}
            />
          </div>

          {/* Category */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as Category | '')}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">— Let Claude decide —</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Priority: <span style={{ color: '#3b82f6', fontWeight: 700 }}>{priority}</span>/10
            </label>
            <input
              type="range" min={1} max={10} value={priority}
              onChange={e => setPriority(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
              <span>1 — Low</span>
              <span>10 — High</span>
            </div>
          </div>

          {/* Notes */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any initial observations, related links, or context..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#ef4444', fontSize: '13px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button" onClick={() => navigate('/')} disabled={submitting}
              style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', color: '#374151', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              style={{ padding: '10px 24px', background: submitting ? '#93c5fd' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600 }}
            >
              {submitting ? 'Analyzing...' : 'Create Hypothesis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
