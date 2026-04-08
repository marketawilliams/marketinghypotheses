# Hypothesis Aggregation & Management System

Captures ideas and hypotheses from Slack (including voice notes), aggregates them into a queryable PostgreSQL database, and surfaces them through a React interface.

## Structure

```
marketinghypotheses/
  backend/        # Express API + Slack webhook receiver (Railway)
  slack-bot/      # Slack Bolt bot (Railway)
  frontend/       # React + TypeScript dashboard (Vercel)
```

## Quick Start

### 1. Database (Railway)
- Provision a PostgreSQL instance on Railway
- Copy the connection string

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in all values
npm run migrate        # run schema migrations
npm start
```

### 3. Slack Bot
```bash
cd slack-bot
npm install
cp .env.example .env   # fill in all values
npm start
```

### 4. Frontend
```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL to your Railway backend URL
npm run dev
```

## Environment Variables

### Backend (.env)
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string from Railway |
| `ANTHROPIC_API_KEY` | Anthropic API key for hypothesis extraction |
| `PORT` | Server port (default: 3000) |
| `SLACK_BOT_TOKEN` | `xoxb-...` token from Slack app |
| `SLACK_SIGNING_SECRET` | Signing secret from Slack app |
| `MONITORED_CHANNELS` | Comma-separated Slack channel IDs |
| `TRIGGER_EMOJI` | Emoji name to trigger capture (default: `test_tube`) |

### Frontend (.env)
| Variable | Description |
|---|---|
| `VITE_API_URL` | URL of deployed backend on Railway |

## Slack App Setup
1. Go to https://api.slack.com/apps and create a new app
2. Enable Events API, set request URL to `https://your-backend.railway.app/slack/events`
3. Subscribe to bot events: `message.channels`, `reaction_added`
4. Add Bot Token Scopes: `channels:history`, `reactions:read`, `files:read`
5. Install app to workspace, copy Bot Token and Signing Secret

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/hypotheses` | List hypotheses (filterable) |
| GET | `/api/hypotheses/:id` | Single hypothesis + history |
| POST | `/api/hypotheses` | Create manually |
| PATCH | `/api/hypotheses/:id` | Update status/priority/notes |
| POST | `/api/hypotheses/:id/notes` | Add a note |
| POST | `/api/slack/capture` | Slack bot webhook |
| GET | `/api/transcription-status/:id` | Check voice note transcription |
