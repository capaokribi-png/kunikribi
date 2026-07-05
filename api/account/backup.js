// api/account/backup.js  — POST {phone, code, data}
const { getUser, saveData, configured } = require('../../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!configured()) return res.status(503).json({ error: 'Cloud non configuré' });
  try {
    const { phone, code, data } = req.body || {};
    const user = await getUser(phone);
    if (!user || String(user.code) !== String(code))
      return res.status(401).json({ error: 'Non autorisé' });
    if (!data || typeof data !== 'object')
      return res.status(400).json({ error: 'Données manquantes' });

    const ok = await saveData(String(phone), data);
    return res.status(ok ? 200 : 500).json(ok ? { ok: true } : { error: 'Sauvegarde échouée' });
  } catch (e) {
    console.error('[backup]', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
