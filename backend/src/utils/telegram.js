const https = require('https');
const pool  = require('../db/pool');

/* Fire-and-forget: reads token/chatId from DB, sends HTML message to Telegram.
   Silently swallows all errors so it never breaks the main request. */
async function sendTelegram(text) {
  try {
    const { rows } = await pool.query(
      'SELECT telegram_bot_token, telegram_chat_id FROM company_settings LIMIT 1'
    );
    const s = rows[0];
    if (!s?.telegram_bot_token || !s?.telegram_chat_id) return; // not configured
    await _post(s.telegram_bot_token, s.telegram_chat_id, text);
  } catch (err) {
    console.error('[Telegram] send error:', err.message);
  }
}

/* Low-level POST helper — also used by the test endpoint */
function _post(token, chatId, text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
    const opts = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (!parsed.ok) throw new Error(parsed.description || 'Telegram error');
          resolve({ ok: true });
        } catch (e) { resolve({ ok: false, error: e.message }); }
      });
    });
    req.on('error', (e) => { console.error('[Telegram] request error:', e.message); resolve({ ok: false }); });
    req.write(body);
    req.end();
  });
}

module.exports = { sendTelegram, _post };
