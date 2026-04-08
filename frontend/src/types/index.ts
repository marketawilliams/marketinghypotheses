export type Status = 'new' | 'in_progress' | 'backburner' | 'complete' | 'archived';
export type Category = 'social' | 'website' | 'bd_gtm' | 'other';

export interface Hypothesis {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: number;
  original_proposer: string;
  tagged_people: string[];
  notes: string;
  source: string;
  slack_thread_url: string;
  raw_transcript: string;
  category: Category | null;
  created_at: string;
  updated_at: string;
}

export interface HypothesisUpdate {
  id: string;
  updated_by: string;
  update_type: string;
  old_value: string;
  new_value: string;
  timestamp: string;
}

export interface HypothesisDetail extends Hypothesis {
  history: HypothesisUpdate[];
}

export interface HypothesesResponse {
  data: Hypothesis[];
  total: number;
  page: number;
  limit: number;
}
