// api/account/activate.js — POST {code, type, phone}
// Vérifie un code d'activation, le marque comme utilisé, renvoie l'expiration.
//
// Version diagnostique : distingue « code introuvable » (invalid) de
// « la base a refusé/échoué » (db_error). La version précédente renvoyait
// « invalid » dans les deux cas — impossible de savoir ce qui clochait.

/* Même normalisation d'URL que lib/supabase.js : une barre oblique finale
   suffirait à tout casser (PGRST125). */
function baseUrl(){
  let u = (process.env.SUPABASE_URL || '').trim();
  u = u.replace(/\/+$/, '');
  u = u.replace(/\/rest\/v1$/, '');
  return u;
}
const URL = baseUrl();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

function headers(extra) {
  const h = { apikey: KEY, 'Content-Type': 'application/json' };
  if (KEY && KEY.indexOf('eyJ') === 0) h.Authorization = 'Bearer ' + KEY;
  return Object.assign(h, extra || {});
}

// Limite anti-brute-force en mémoire. Volontairement large : sur Vercel ce
// compteur se remet à zéro à chaque instance, il gêne donc surtout
// l'utilisateur honnête qui fait une faute de frappe.
const tentatives = new Map();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  if (!URL || !KEY) return res.status(503).json({ ok: false, error: 'cloud_non_configure' });

  const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const t = tentatives.get(ip) || { n: 0, reset: now + 15 * 60 * 1000 };
  if (now > t.reset) { t.n = 0; t.reset = now + 15 * 60 * 1000; }
  if (t.n >= 15) return res.status(429).json({ ok: false, error: 'too_many' });
  t.n++; tentatives.set(ip, t);

  const { code, type, phone } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: 'missing' });
  if (typeof code !== 'string' || code.length > 64) {
    return res.status(400).json({ ok: false, error: 'bad_input' });
  }
  // `type` est devenu FACULTATIF. C'est la base qui sait ce qu'est un code —
  // le client n'a pas à le deviner d'après un préfixe. Sans ça, une clé
  // générée par un revendeur (« 5XAK-MENK-… ») serait toujours refusée.
  const typeVoulu = (typeof type === 'string' && type.length <= 32) ? type : null;
  const codeNorm = code.trim().toUpperCase();

  try {
    // 1) Chercher le code : bon type, pas encore utilisé
    const q = URL + '/rest/v1/activation_codes'
      + '?code=eq.' + encodeURIComponent(codeNorm)
      + (typeVoulu ? '&type=eq.' + encodeURIComponent(typeVoulu) : '')
      + '&used=eq.false&select=*&limit=1';
    const r = await fetch(q, { headers: headers() });
    const brut = await r.text();

    // C'EST ICI que la version precedente mentait : un 401/403/500 de PostgREST
    // etait confondu avec « code inconnu ». On separe enfin les deux.
    if (!r.ok) {
      console.error('[activate] lecture HTTP', r.status, brut.slice(0, 300));
      return res.status(500).json({
        ok: false, error: 'db_error',
        detail: 'HTTP ' + r.status + ' : ' + brut.slice(0, 200)
      });
    }

    let rows = null;
    try { rows = JSON.parse(brut); } catch (e) {
      return res.status(500).json({ ok: false, error: 'db_error', detail: 'reponse illisible' });
    }
    if (!Array.isArray(rows)) {
      // PostgREST renvoie un objet {message,...} en cas de refus RLS ou de cle invalide
      console.error('[activate] reponse inattendue', brut.slice(0, 300));
      return res.status(500).json({
        ok: false, error: 'db_error', detail: String(brut).slice(0, 200)
      });
    }
    if (rows.length === 0) {
      // La, et seulement la, le code est reellement inconnu / deja utilise / mauvais type
      return res.status(200).json({ ok: false, error: 'invalid' });
    }

    const data = rows[0];
    const days = Number(data.duration_days) || 0;
    const exp = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

    // 2) Le consommer. Le filtre used=eq.false est repete : si deux requetes
    //    arrivent en meme temps, une seule verra une ligne modifiee.
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
    const brutU = await u.text();
    if (!u.ok) {
      console.error('[activate] ecriture HTTP', u.status, brutU.slice(0, 300));
      return res.status(500).json({
        ok: false, error: 'db_error',
        detail: 'PATCH HTTP ' + u.status + ' : ' + brutU.slice(0, 200)
      });
    }
    let updated = null;
    try { updated = JSON.parse(brutU); } catch (e) {}
    if (!Array.isArray(updated) || updated.length === 0) {
      return res.status(200).json({ ok: false, error: 'invalid' }); // consomme entre-temps
    }

    // On renvoie le type LU EN BASE : c'est lui qui fait foi.
    return res.status(200).json({ ok: true, exp: exp, type: data.type });
  } catch (e) {
    console.error('[activate]', e);
    return res.status(500).json({ ok: false, error: 'db_error', detail: String(e && e.message).slice(0, 200) });
  }
};
