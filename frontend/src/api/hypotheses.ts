import { Hypothesis, HypothesisDetail, HypothesesResponse } from '../types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const getHypotheses = async (params?: Record<string, string>): Promise<HypothesesResponse> => {
  const query = params ? new URLSearchParams(params).toString() : '';
  const res = await fetch(`${BASE}/api/hypotheses?${query}`);
  if (!res.ok) throw new Error('Failed to fetch hypotheses');
  return res.json();
};

export const getHypothesis = async (id: string): Promise<HypothesisDetail> => {
  const res = await fetch(`${BASE}/api/hypotheses/${id}`);
  if (!res.ok) throw new Error('Failed to fetch hypothesis');
  return res.json();
};

export const updateHypothesis = async (id: string, data: Partial<Hypothesis> & { updated_by?: string }): Promise<Hypothesis> => {
  const res = await fetch(`${BASE}/api/hypotheses/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update hypothesis');
  return res.json();
};

export const createHypothesis = async (data: Partial<Hypothesis> & { raw_text?: string }): Promise<Hypothesis> => {
  const res = await fetch(`${BASE}/api/hypotheses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create hypothesis');
  return res.json();
};

export const addNote = async (id: string, note: string, updated_by: string): Promise<Hypothesis> => {
  const res = await fetch(`${BASE}/api/hypotheses/${id}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note, updated_by }),
  });
  if (!res.ok) throw new Error('Failed to add note');
  return res.json();
};
