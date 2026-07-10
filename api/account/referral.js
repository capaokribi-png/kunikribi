// api/referral.js — Parrainage CuniSmart
// POST {action:'link',  referrer_phone, referred_phone}  → enregistre le parrainage à l'inscription
// POST {action:'stats', phone}                           → statistiques du parrain (inscrits, conversions, gains)
// GET/POST {action:'convert', admin, phone, plan}        → ADMIN : marque une conversion ('pro' = 500 F, 'superpro' = 1000 F)
//   Exemple admin (navigateur) : /api/referral?action=convert&admin=VOTRE_SECRET&phone=2376XXXXXXX&plan=pro
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN = process.env.REFERRAL_ADMIN_SECRET || '';

function headers(extra) {
  const h = { apikey: KEY, 'Content-Type': 'application/json' };
  if (KEY && KEY.indexOf('eyJ') === 0) h.Authorization = 'Bearer ' + KEY;
  return Object.assign(h, extra || {});
}
function okPhone(p) { return /^\d{8,}$/.test(String(p || '')); }

module.exports = async (req, res) => {
  if (!URL || !KEY) return res.status(503).json({ error: 'Cloud non configuré' });
  const q = req.query || {};
  const b = req.body || {};
  const action = b.action || q.action;

  try {
    /* ---------- 1) Lier un filleul à son parrain (à l'inscription) ---------- */
    if (action === 'link') {
      const parrain = String(b.referrer_phone || '');
      const filleul = String(b.referred_phone || '');
      if (!okPhone(parrain) || !okPhone(filleul)) return res.status(400).json({ error: 'Numéros invalides' });
      if (parrain === filleul) return res.status(400).json({ error: 'Auto-parrainage refusé' });

      // déjà parrainé ? (un filleul ne compte qu'une fois)
      const chk = await fetch(URL + '/rest/v1/referrals?referred_phone=eq.' + encodeURIComponent(filleul) + '&select=id', { headers: headers() });
      const rows = await chk.json();
      if (Array.isArray(rows) && rows.length) return res.status(200).json({ ok: true, deja: true });

      const ins = await fetch(URL + '/rest/v1/referrals', {
        method: 'POST',
        headers: headers({ Prefer: 'return=minimal' }),
        body: JSON.stringify({ referrer_phone: parrain, referred_phone: filleul, status: 'inscrit', reward: 0 }),
      });
      return res.status(ins.ok ? 200 : 500).json(ins.ok ? { ok: true } : { error: 'Insertion impossible' });
    }

    /* ---------- 2) Statistiques du parrain ---------- */
    if (action === 'stats') {
      const phone = String(b.phone || '');
      if (!okPhone(phone)) return res.status(400).json({ error: 'Numéro invalide' });
      const r = await fetch(URL + '/rest/v1/referrals?referrer_phone=eq.' + encodeURIComponent(phone) + '&select=status,reward', { headers: headers() });
      const rows = await r.json();
      if (!Array.isArray(rows)) return res.status(500).json({ error: 'Lecture impossible' });
      const inscrits = rows.length;
      const conversions = rows.filter(x => x.status === 'pro' || x.status === 'superpro').length;
      const gains = rows.reduce((s, x) => s + (x.reward || 0), 0);
      return res.status(200).json({ ok: true, inscrits, conversions, gains });
    }

    /* ---------- 3) ADMIN : marquer une conversion (à l'activation Pro/Super PRO) ---------- */
    if (action === 'convert') {
      const admin = String(b.admin || q.admin || '');
      if (!ADMIN || admin !== ADMIN) return res.status(401).json({ error: 'Accès refusé' });
      const filleul = String(b.phone || q.phone || '');
      const plan = String(b.plan || q.plan || '').toLowerCase();
      if (!okPhone(filleul) || (plan !== 'pro' && plan !== 'superpro'))
        return res.status(400).json({ error: 'Paramètres invalides (phone, plan=pro|superpro)' });
      const reward = plan === 'superpro' ? 1000 : 500;

      const up = await fetch(URL + '/rest/v1/referrals?referred_phone=eq.' + encodeURIComponent(filleul), {
        method: 'PATCH',
        headers: headers({ Prefer: 'return=representation' }),
        body: JSON.stringify({ status: plan, reward: reward, converted_at: new Date().toISOString() }),
      });
      const rows = await up.json().catch(() => null);
      const row = Array.isArray(rows) && rows.length ? rows[0] : null;
      if (!row) return res.status(404).json({ error: 'Aucun parrainage trouvé pour ce numéro' });
      return res.status(200).json({ ok: true, parrain_a_payer: row.referrer_phone, montant: reward, plan: plan });
    }

    return res.status(400).json({ error: 'Action inconnue' });
  } catch (e) {
    console.error('[referral]', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
