import crypto from 'crypto';

const tentatives = new Map();

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  // Rate limiting léger : 30 requêtes / 10 min / IP
  const ip = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const t = tentatives.get(ip) || { n: 0, reset: now + 10 * 60 * 1000 };
  if (now > t.reset) { t.n = 0; t.reset = now + 10 * 60 * 1000; }
  if (t.n >= 30) return res.status(429).json({ ok: false, error: 'too_many' });
  t.n++; tentatives.set(ip, t);

  const { payload } = req.body || {};
  if (!payload || typeof payload !== 'string' || payload.length > 8000) {
    return res.status(400).json({ ok: false, error: 'bad_payload' });
  }

  const sig = crypto
    .createHmac('sha256', process.env.LOT_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 20);

  return res.status(200).json({ ok: true, sig });
}
