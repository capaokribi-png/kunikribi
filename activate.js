// api/account/activate.js — POST {code, type, phone}
// Vérifie un code d'activation, le marque comme utilisé et renvoie la date d'expiration.
// Réécrit sur fetch natif (aucune dépendance npm) et sur SUPABASE_SERVICE_ROLE_KEY,
// pour rester cohérent avec login.js / backup.js / restore.js / referral.js.

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // clé service_role — jamais la clé publique

function headers(extra) {
  const h = { apikey: KEY, 'Content-Type': 'application/json' };
  // Les nouvelles clés Supabase (sb_secret_...) ne sont pas des JWT : uniquement dans apikey.
  // Les anciennes clés service_role (eyJ...) vont aussi dans Authorization.
  if (KEY && KEY.indexOf('eyJ') === 0) h.Authorization = 'Bearer ' + KEY;
  return Object.assign(h, extra || {});
}
function configured() { return !!(URL && KEY); }

// Limite anti-brute-force en mémoire : 5 tentatives / 15 min / IP
const tentatives = new Map();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  if (!configured()) return res.status(503).json({ ok: false, error: 'cloud_non_configure' });

  const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const t = tentatives.get(ip) || { n: 0, reset: now + 15 * 60 * 1000 };
  if (now > t.reset) { t.n = 0; t.reset = now + 15 * 60 * 1000; }
  if (t.n >= 5) return res.status(429).json({ ok: false, error: 'too_many' });
  t.n++; tentatives.set(ip, t);

  const { code, type, phone } = req.body || {};
  if (!code || !type) return res.status(400).json({ ok: false, error: 'missing' });
  if (typeof code !== 'string' || code.length > 64 || typeof type !== 'string' || type.length > 32) {
    return res.status(400).json({ ok: false, error: 'bad_input' });
  }
  const codeNorm = code.trim().toUpperCase();

  try {
    // 1) Chercher le code : non utilisé, du bon type
    const q = URL + '/rest/v1/activation_codes'
      + '?code=eq.' + encodeURIComponent(codeNorm)
      + '&type=eq.' + encodeURIComponent(type)
      + '&used=eq.false&select=*&limit=1';
    const r = await fetch(q, { headers: headers() });
    const rows = await r.json();
    const data = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!data) return res.status(200).json({ ok: false, error: 'invalid' });

    const days = Number(data.duration_days) || 0;
    const exp = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

    // 2) Le consommer. Le filtre used=eq.false est répété volontairement :
    //    si deux requêtes arrivent en même temps avec le même code, une seule
    //    verra une ligne modifiée — l'autre reçoit un tableau vide et est rejetée.
    const u = await fetch(
      URL + '/rest/v1/activation_codes?code=eq.' + encodeURIComponent(codeNorm) + '&used=eq.false',
      {
        method: 'PATCH',
        headers: headers({ Prefer: 'return=representation' }),
        body: JSON.stringify({
          used: true,
          used_by_phone: phone || null,
          used_at: new Date().toISOString(),
        }),
      }
    );
    const updated = await u.json();
    if (!u.ok || !Array.isArray(updated) || updated.length === 0) {
      return res.status(200).json({ ok: false, error: 'invalid' }); // déjà consommé entre-temps
    }

    return res.status(200).json({ ok: true, exp });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'server' });
  }
};
