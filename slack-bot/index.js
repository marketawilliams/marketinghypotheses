require('dotenv').config();
const { App } = require('@slack/bolt');
const fetch = require('node-fetch');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
});

const MONITORED_CHANNELS = (process.env.MONITORED_CHANNELS || '').split(',').filter(Boolean);
const TRIGGER_EMOJI = process.env.TRIGGER_EMOJI || 'test_tube';
const BACKEND_URL = process.env.BACKEND_WEBHOOK_URL;

// Passive: capture messages in monitored channels
app.message(async ({ message, client }) => {
  if (!MONITORED_CHANNELS.includes(message.channel)) return;
  if (message.subtype === 'bot_message') return;
  await captureThread(client, message.channel, message.thread_ts || message.ts, 'slack_thread');
});

// Active: emoji reaction trigger
app.event('reaction_added', async ({ event, client }) => {
  if (event.reaction !== TRIGGER_EMOJI) return;
  const { channel, ts } = event.item;
  await captureThread(client, channel, ts, 'emoji_trigger');
});

async function captureThread(client, channel, thread_ts, source) {
  try {
    const result = await client.conversations.replies({
      channel,
      ts: thread_ts,
    });

    const permalink = await client.chat.getPermalink({
      channel,
      message_ts: thread_ts,
    }).catch(() => ({ permalink: null }));

    const payload = {
      channel_id: channel,
      thread_ts,
      thread_url: permalink.permalink,
      messages: result.messages,
      source,
    };

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log(`Captured thread ${thread_ts} -> hypothesis ${data.hypothesis_id}`);
  } catch (err) {
    console.error('Failed to capture thread:', err.message);
  }
}

(async () => {
  await app.start(process.env.PORT || 3001);
  console.log('Slack bot running on port', process.env.PORT || 3001);
})();
