// api/referral.js — POST { action, ... }
//   action 'link'  : { referrer_phone, referred_phone }  → lie un filleul à un parrain
//   action 'stats' : { phone }                           → renvoie {inscrits, conversions, gains}
//
// Utilise la SERVICE ROLE key via les variables d'env (comme lib/supabase.js).
// La table 'referrals' doit exister (voir creer-table-referrals.sql).

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers(extra) {
  const h = { apikey: KEY, 'Content-Type': 'application/json' };
  if (KEY && KEY.indexOf('eyJ') === 0) h.Authorization = 'Bearer ' + KEY;
  return Object.assign(h, extra || {});
}
function configured() { return !!(URL && KEY); }

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!configured()) return res.status(503).json({ ok: false, error: 'Cloud non configuré' });

  try {
    const body = req.body || {};
    const action = body.action;

    // ───────────────────────── LIER UN FILLEUL ─────────────────────────
    if (action === 'link') {
      const referrer = String(body.referrer_phone || '').trim();
      const referred = String(body.referred_phone || '').trim();
      // garde-fous : deux identifiants valides, et on ne se parraine pas soi-même
      if (referrer.length < 4 || referred.length < 4 || referrer === referred) {
        return res.status(200).json({ ok: false, error: 'invalid' });
      }
      // insert ; si le filleul est déjà lié (unique), on ignore proprement
      const r = await fetch(URL + '/rest/v1/referrals', {
        method: 'POST',
        headers: headers({ Prefer: 'resolution=ignore-duplicates,return=minimal' }),
        body: JSON.stringify({ referrer_phone: referrer, referred_phone: referred })
      });
      // 201 créé, 200/409 déjà présent → dans tous ces cas c'est "ok" côté app
      if (r.status === 201 || r.status === 200 || r.status === 409) {
        return res.status(200).json({ ok: true });
      }
      const txt = await r.text();
      return res.status(500).json({ ok: false, error: 'db', detail: String(txt).slice(0, 180) });
    }

    // ───────────────────────── STATS D'UN PARRAIN ─────────────────────────
    if (action === 'stats') {
      const phone = String(body.phone || '').trim();
      if (phone.length < 4) return res.status(200).json({ ok: false, error: 'invalid' });

      const r = await fetch(
        URL + '/rest/v1/referrals?referrer_phone=eq.' + encodeURIComponent(phone) + '&select=status,reward',
        { headers: headers() }
      );
      if (!r.ok) {
        const txt = await r.text();
        return res.status(500).json({ ok: false, error: 'db', detail: String(txt).slice(0, 180) });
      }
      const rows = await r.json();
      const inscrits = rows.length;
      const conversions = rows.filter(x => x.status === 'converti').length;
      // 500 F pour un filleul Pro, 1000 F pour un Super PRO
      const gains = rows.reduce((s, x) => s + (Number(x.reward) || 0), 0);
      return res.status(200).json({ ok: true, inscrits, conversions, gains });
    }

    return res.status(400).json({ ok: false, error: 'unknown action' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'server', detail: String(e && e.message || e).slice(0, 180) });
  }
};
