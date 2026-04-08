CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS hypotheses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_thread_url TEXT,
  slack_message_id TEXT,
  slack_channel_id TEXT,
  slack_thread_ts TEXT,
  original_proposer TEXT,
  title TEXT NOT NULL,
  description TEXT,
  raw_transcript TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'backburner', 'complete', 'archived')),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  tagged_people TEXT[],
  notes TEXT,
  source TEXT CHECK (source IN ('slack_thread', 'slack_dm', 'emoji_trigger', 'manual')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_captured_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hypothesis_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hypothesis_id UUID REFERENCES hypotheses(id) ON DELETE CASCADE,
  updated_by TEXT,
  update_type TEXT CHECK (update_type IN ('status_change', 'priority_change', 'note_added', 'created')),
  old_value TEXT,
  new_value TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS slack_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_channel_id TEXT,
  slack_thread_ts TEXT,
  slack_thread_url TEXT,
  raw_json JSONB,
  transcription_status TEXT DEFAULT 'pending'
    CHECK (transcription_status IN ('pending', 'processing', 'complete', 'failed', 'not_needed')),
  hypothesis_id UUID REFERENCES hypotheses(id),
  created_at TIMESTAMP DEFAULT NOW()
);
