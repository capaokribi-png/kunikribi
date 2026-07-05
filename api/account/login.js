// api/account/login.js  — POST {phone, code}
// First time: creates the account with that code. Later: verifies code.
const { getUser, createUser, configured } = require('../../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!configured()) return res.status(503).json({ error: 'Cloud non configuré' });
  try {
    const { phone, code } = req.body || {};
    if (!/^\d{8,}$/.test(String(phone || '')) || String(code || '').length < 4)
      return res.status(400).json({ error: 'Numéro ou code invalide' });

    let user = await getUser(phone);
    if (!user) {
      user = await createUser(String(phone), String(code));
      if (!user) return res.status(500).json({ error: 'Création impossible' });
      return res.status(200).json({ ok: true, created: true, pro: false });
    }
    if (String(user.code) !== String(code))
      return res.status(401).json({ error: 'Numéro ou code incorrect' });
    return res.status(200).json({ ok: true, pro: user.pro === true });
  } catch (e) {
    console.error('[login]', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
