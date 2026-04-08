require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/hypotheses
// List with optional filters, search, sort, pagination.
// ---------------------------------------------------------------------------
app.get('/api/hypotheses', async (req, res) => {
  try {
    const {
      status,
      search,
      sort_by = 'created_at',
      sort_dir = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    // Whitelist sort column and direction to prevent injection.
    const allowedSortBy = ['created_at', 'updated_at', 'priority'];
    const allowedSortDir = ['asc', 'desc'];
    const safeSortBy = allowedSortBy.includes(sort_by) ? sort_by : 'created_at';
    const safeSortDir = allowedSortDir.includes(sort_dir.toLowerCase()) ? sort_dir.toLowerCase() : 'desc';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause dynamically.
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query — uses the same params array up to this point.
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM hypotheses ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query — add pagination params after the shared ones.
    const dataParams = [...params, limitNum, offset];
    const dataResult = await pool.query(
      `SELECT * FROM hypotheses ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortDir}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({
      data: dataResult.rows,
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error('GET /api/hypotheses error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/hypotheses/:id
// Single hypothesis with full update history.
// ---------------------------------------------------------------------------
app.get('/api/hypotheses/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const hypothesisResult = await pool.query(
      'SELECT * FROM hypotheses WHERE id = $1',
      [id]
    );

    if (hypothesisResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hypothesis not found' });
    }

    const updatesResult = await pool.query(
      'SELECT * FROM hypothesis_updates WHERE hypothesis_id = $1 ORDER BY timestamp ASC',
      [id]
    );

    res.json({
      ...hypothesisResult.rows[0],
      history: updatesResult.rows,
    });
  } catch (err) {
    console.error('GET /api/hypotheses/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/hypotheses
// Manually create a hypothesis.
// ---------------------------------------------------------------------------
app.post('/api/hypotheses', async (req, res) => {
  try {
    const {
      title,
      description,
      original_proposer,
      priority,
      notes,
      tagged_people,
      source = 'manual',
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const insertResult = await pool.query(
      `INSERT INTO hypotheses
         (title, description, original_proposer, priority, notes, tagged_people, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, original_proposer, priority || 5, notes, tagged_people || [], source]
    );

    const hypothesis = insertResult.rows[0];

    // Log creation event.
    await pool.query(
      `INSERT INTO hypothesis_updates
         (hypothesis_id, updated_by, update_type, old_value, new_value)
       VALUES ($1, $2, 'created', NULL, $3)`,
      [hypothesis.id, original_proposer || 'system', title]
    );

    res.status(201).json(hypothesis);
  } catch (err) {
    console.error('POST /api/hypotheses error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/hypotheses/:id
// Update status, priority, notes. Log all changes.
// ---------------------------------------------------------------------------
app.patch('/api/hypotheses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, notes, updated_by } = req.body;

    const existingResult = await pool.query(
      'SELECT * FROM hypotheses WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hypothesis not found' });
    }

    const existing = existingResult.rows[0];
    const updateLog = [];

    if (status !== undefined && status !== existing.status) {
      updateLog.push({
        update_type: 'status_change',
        old_value: existing.status,
        new_value: status,
      });
    }

    if (priority !== undefined && priority !== existing.priority) {
      updateLog.push({
        update_type: 'priority_change',
        old_value: String(existing.priority),
        new_value: String(priority),
      });
    }

    if (notes !== undefined && notes !== existing.notes) {
      updateLog.push({
        update_type: 'note_added',
        old_value: existing.notes,
        new_value: notes,
      });
    }

    const updatedResult = await pool.query(
      `UPDATE hypotheses
       SET
         status     = COALESCE($1, status),
         priority   = COALESCE($2, priority),
         notes      = COALESCE($3, notes),
         updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, priority, notes, id]
    );

    // Persist all change log entries.
    for (const entry of updateLog) {
      await pool.query(
        `INSERT INTO hypothesis_updates
           (hypothesis_id, updated_by, update_type, old_value, new_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, updated_by || 'system', entry.update_type, entry.old_value, entry.new_value]
      );
    }

    res.json(updatedResult.rows[0]);
  } catch (err) {
    console.error('PATCH /api/hypotheses/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/hypotheses/:id/notes
// Append a timestamped note to an existing hypothesis.
// ---------------------------------------------------------------------------
app.post('/api/hypotheses/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { note, updated_by } = req.body;

    if (!note) {
      return res.status(400).json({ error: 'note is required' });
    }

    const existingResult = await pool.query(
      'SELECT * FROM hypotheses WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hypothesis not found' });
    }

    const existing = existingResult.rows[0];
    const timestamp = new Date().toISOString();
    const appendedNote = existing.notes
      ? `${existing.notes}\n\n[${timestamp}] ${note}`
      : `[${timestamp}] ${note}`;

    const updatedResult = await pool.query(
      `UPDATE hypotheses
       SET notes = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [appendedNote, id]
    );

    await pool.query(
      `INSERT INTO hypothesis_updates
         (hypothesis_id, updated_by, update_type, old_value, new_value)
       VALUES ($1, $2, 'note_added', $3, $4)`,
      [id, updated_by || 'system', existing.notes, appendedNote]
    );

    res.json(updatedResult.rows[0]);
  } catch (err) {
    console.error('POST /api/hypotheses/:id/notes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Helper: extract hypothesis data from Slack thread text via Claude.
// ---------------------------------------------------------------------------
async function extractHypothesisWithClaude(threadText, proposerHint) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a marketing hypothesis extractor. Given the following Slack thread, extract a structured hypothesis card.

Respond with ONLY a JSON object in this exact format (no markdown, no explanation):
{
  "title": "short hypothesis title",
  "description": "full hypothesis description",
  "original_proposer": "name or username of whoever proposed it"
}

If you cannot determine the proposer, use this hint: "${proposerHint || 'unknown'}".

Slack thread:
${threadText}`,
      },
    ],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';

  let extracted = { title: 'Untitled Hypothesis', description: '', original_proposer: proposerHint || 'unknown' };
  try {
    extracted = JSON.parse(rawText);
  } catch (parseErr) {
    console.error('Failed to parse Claude response as JSON:', parseErr);
    console.error('Raw Claude response:', rawText);
  }

  return extracted;
}

// ---------------------------------------------------------------------------
// Helper: stub for async voice note processing.
// ---------------------------------------------------------------------------
async function processVoiceNotes(captureId) {
  console.log(`Voice note processing not yet implemented (capture id: ${captureId})`);
  try {
    await pool.query(
      `UPDATE slack_captures SET transcription_status = 'failed' WHERE id = $1`,
      [captureId]
    );
  } catch (err) {
    console.error('processVoiceNotes: failed to update transcription_status:', err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/slack/capture
// Receive a Slack webhook payload, store the capture, run Claude extraction,
// create a hypothesis card, and (if voice notes are present) queue processing.
// ---------------------------------------------------------------------------
app.post('/api/slack/capture', async (req, res) => {
  try {
    const payload = req.body;

    const slackChannelId = payload.channel_id || payload.channel || null;
    const slackThreadTs = payload.thread_ts || payload.ts || null;
    const slackThreadUrl = payload.thread_url || null;

    // Collect raw thread text from message array or top-level text.
    let threadText = '';
    let proposerHint = null;
    let hasVoiceNotes = false;

    if (Array.isArray(payload.messages)) {
      threadText = payload.messages
        .map((m) => {
          if (m.subtype === 'file_share' && m.files) {
            const audioFiles = m.files.filter((f) =>
              f.mimetype && f.mimetype.startsWith('audio/')
            );
            if (audioFiles.length > 0) hasVoiceNotes = true;
          }
          return `${m.user || m.username || 'unknown'}: ${m.text || ''}`;
        })
        .join('\n');

      if (payload.messages.length > 0) {
        proposerHint = payload.messages[0].user || payload.messages[0].username || null;
      }
    } else if (payload.text) {
      threadText = payload.text;
      proposerHint = payload.user || payload.username || null;

      if (payload.files) {
        const audioFiles = payload.files.filter((f) =>
          f.mimetype && f.mimetype.startsWith('audio/')
        );
        if (audioFiles.length > 0) hasVoiceNotes = true;
      }
    }

    // Store the raw capture first so we have an id to reference.
    const captureResult = await pool.query(
      `INSERT INTO slack_captures
         (slack_channel_id, slack_thread_ts, slack_thread_url, raw_json, transcription_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        slackChannelId,
        slackThreadTs,
        slackThreadUrl,
        JSON.stringify(payload),
        hasVoiceNotes ? 'pending' : 'not_needed',
      ]
    );

    const capture = captureResult.rows[0];

    // Use Claude to extract the hypothesis fields.
    const extracted = await extractHypothesisWithClaude(threadText, proposerHint);

    // Create the hypothesis card.
    const hypothesisResult = await pool.query(
      `INSERT INTO hypotheses
         (title, description, original_proposer, slack_thread_url, slack_channel_id,
          slack_thread_ts, source, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'slack_thread', 'new')
       RETURNING *`,
      [
        extracted.title || 'Untitled Hypothesis',
        extracted.description || '',
        extracted.original_proposer || proposerHint || 'unknown',
        slackThreadUrl,
        slackChannelId,
        slackThreadTs,
      ]
    );

    const hypothesis = hypothesisResult.rows[0];

    // Log creation event.
    await pool.query(
      `INSERT INTO hypothesis_updates
         (hypothesis_id, updated_by, update_type, old_value, new_value)
       VALUES ($1, 'slack_capture', 'created', NULL, $2)`,
      [hypothesis.id, hypothesis.title]
    );

    // Link the capture to the new hypothesis.
    await pool.query(
      `UPDATE slack_captures SET hypothesis_id = $1 WHERE id = $2`,
      [hypothesis.id, capture.id]
    );

    // Queue voice note processing asynchronously if needed.
    if (hasVoiceNotes) {
      setImmediate(() => processVoiceNotes(capture.id));
    }

    res.status(201).json({
      capture_id: capture.id,
      hypothesis,
      has_voice_notes: hasVoiceNotes,
    });
  } catch (err) {
    console.error('POST /api/slack/capture error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/transcription-status/:id
// Return the transcription status for the slack_capture linked to a hypothesis.
// ---------------------------------------------------------------------------
app.get('/api/transcription-status/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT transcription_status FROM slack_captures WHERE hypothesis_id = $1 LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No capture found for this hypothesis id' });
    }

    res.json({ transcription_status: result.rows[0].transcription_status });
  } catch (err) {
    console.error('GET /api/transcription-status/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/zapier/capture
// Receive a Zapier webhook from Slack emoji trigger.
// Runs your exact hypothesis-detection prompt against Claude, stores result.
// ---------------------------------------------------------------------------
app.post('/api/zapier/capture', async (req, res) => {
  try {
    const {
      message_text,   // Zapier: the flagged message text
      author_name,    // Zapier: display name of message author
      channel_name,   // Zapier: channel name (or "direct_message")
      channel_id,     // Zapier: channel ID
      message_ts,     // Zapier: message timestamp
      permalink,      // Zapier: link to original message (optional)
    } = req.body;

    if (!message_text) {
      return res.status(400).json({ error: 'message_text is required' });
    }

    // Store raw capture immediately.
    const captureResult = await pool.query(
      `INSERT INTO slack_captures
         (slack_channel_id, slack_thread_ts, slack_thread_url, raw_json, transcription_status)
       VALUES ($1, $2, $3, $4, 'not_needed')
       RETURNING *`,
      [channel_id || null, message_ts || null, permalink || null, JSON.stringify(req.body)]
    );
    const capture = captureResult.rows[0];

    // Run your exact hypothesis-detection prompt.
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are analyzing a Slack message that someone flagged as potentially containing a hypothesis for testing.

SLACK MESSAGE:
${message_text}

AUTHOR: ${author_name || 'unknown'}
CHANNEL: ${channel_name || 'unknown'}

Your task:
Determine if this message contains or implies a testable hypothesis. This includes:
- Explicit hypotheses ("We believe X will cause Y")
- Implied hypotheses ("Should we try X?" suggests testing X)
- Questions that imply testing ("What if we did X?" implies testing X's impact)
- Observations that suggest opportunities ("We haven't considered X" implies testing X)

A hypothesis is NOT testable if it's:
- Pure information sharing with no implied action
- A completed action report
- Administrative/logistical coordination
- General questions seeking information (not proposing a test)

Return ONLY the values in this EXACT format:

IS_HYPOTHESIS: true or false
HYPOTHESIS_TITLE: [if true: short descriptive title | if false: leave empty]
BECAUSE: [if true: context/belief/observation | if false: leave empty]
WE_BELIEVE: [if true: the hypothesis - make it explicit even if implied | if false: leave empty]
IF_TRUE_WE_EXPECT: [if true: expected outcome | if false: leave empty]
AUTHOR: person's name
SOURCE: Slack
CHANNEL: channel name
ANALYSIS: [if true: "Testable hypothesis identified" | if false: "Rejected: [brief reason]"]`,
      }],
    });

    const rawText = claudeResponse.content[0]?.text || '';

    // Parse the line-based format Claude returns.
    const lines = rawText.split('\n').reduce((acc, line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) return acc;
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      acc[key] = value;
      return acc;
    }, {});

    const isHypothesis = lines['IS_HYPOTHESIS']?.toLowerCase() === 'true';

    // If Claude says it's not a hypothesis, record it but don't create a card.
    if (!isHypothesis) {
      await pool.query(
        `UPDATE slack_captures SET transcription_status = 'complete' WHERE id = $1`,
        [capture.id]
      );
      return res.json({
        capture_id: capture.id,
        is_hypothesis: false,
        analysis: lines['ANALYSIS'] || 'Rejected',
      });
    }

    // Build a rich description from the structured fields.
    const description = [
      lines['BECAUSE'] ? `**Because:** ${lines['BECAUSE']}` : null,
      lines['WE_BELIEVE'] ? `**We believe:** ${lines['WE_BELIEVE']}` : null,
      lines['IF_TRUE_WE_EXPECT'] ? `**If true we expect:** ${lines['IF_TRUE_WE_EXPECT']}` : null,
    ].filter(Boolean).join('\n\n');

    // Create the hypothesis card.
    const hypothesisResult = await pool.query(
      `INSERT INTO hypotheses
         (title, description, original_proposer, slack_thread_url, slack_channel_id,
          slack_thread_ts, source, status, raw_transcript)
       VALUES ($1, $2, $3, $4, $5, $6, 'emoji_trigger', 'new', $7)
       RETURNING *`,
      [
        lines['HYPOTHESIS_TITLE'] || 'Untitled Hypothesis',
        description,
        author_name || 'unknown',
        permalink || null,
        channel_id || null,
        message_ts || null,
        rawText,
      ]
    );

    const hypothesis = hypothesisResult.rows[0];

    await pool.query(
      `INSERT INTO hypothesis_updates
         (hypothesis_id, updated_by, update_type, old_value, new_value)
       VALUES ($1, 'zapier', 'created', NULL, $2)`,
      [hypothesis.id, hypothesis.title]
    );

    await pool.query(
      `UPDATE slack_captures SET hypothesis_id = $1, transcription_status = 'complete' WHERE id = $2`,
      [hypothesis.id, capture.id]
    );

    res.status(201).json({
      capture_id: capture.id,
      hypothesis_id: hypothesis.id,
      is_hypothesis: true,
      title: hypothesis.title,
    });
  } catch (err) {
    console.error('POST /api/zapier/capture error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Hypothesis backend listening on port ${PORT}`);
});
