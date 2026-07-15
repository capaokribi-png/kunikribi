// api/account/restore.js  — POST {phone, code}
const { getUser, configured } = require('../../lib/supabase');
const { normPhone } = require('../../lib/phone');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!configured()) return res.status(503).json({ error: 'Cloud non configuré' });
  try {
    const { phone, code } = req.body || {};

    const p = normPhone(phone);
    if (!p) return res.status(400).json({ error: 'Numéro invalide' });

    const user = await getUser(p);
    if (!user || String(user.code) !== String(code))
      return res.status(401).json({ error: 'Non autorisé' });
    return res.status(200).json({ ok: true, data: user.data || {}, pro: user.pro === true });
  } catch (e) {
    console.error('[restore]', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
