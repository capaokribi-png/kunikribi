// api/account/login.js  — POST {phone, code}
// First time: creates the account with that code. Later: verifies code.
const { getUser, createUser, configured } = require('../../lib/supabase');
const { normPhone } = require('../../lib/phone');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!configured()) return res.status(503).json({ error: 'Cloud non configuré' });
  try {
    const { phone, code } = req.body || {};

    // Normalisation : c'est ICI que se joue l'unicité du compte. Le serveur est
    // seul juge — même si le client oublie de normaliser, on retombe sur ses pieds.
    // Accepte un numéro (Cameroun/Bénin, normalisé) OU un identifiant libre
    // (autres pays). Voir lib/phone.js.
    const p = normPhone(phone);
    if (!p) {
      return res.status(400).json({
        error: "Identifiant trop court. Utilisez votre numéro de téléphone (avec l'indicatif) ou un identifiant d'au moins 4 caractères."
      });
    }
    if (String(code || '').length < 4) {
      return res.status(400).json({ error: 'Code trop court (4 caractères minimum)' });
    }

    let user = await getUser(p);
    if (!user) {
      const c = await createUser(p, String(code));
      if (!c.ok || !c.row) {
        return res.status(500).json({ error: 'Création impossible — HTTP ' + c.status + ' : ' + String(c.raw).slice(0, 180) });
      }
      // `phone` renvoyé : le client stocke la forme canonique, pas ce qu'il a tapé.
      return res.status(200).json({ ok: true, created: true, pro: false, phone: p });
    }
    if (String(user.code) !== String(code))
      return res.status(401).json({ error: 'Numéro ou code incorrect' });

    // `aDesDonnees` permet au client de décider s'il propose une restauration.
    const d = user.data;
    const aDesDonnees = !!(d && typeof d === 'object' && Object.keys(d).length > 0);

    return res.status(200).json({
      ok: true,
      pro: user.pro === true,
      phone: p,
      aDesDonnees: aDesDonnees
    });
  } catch (e) {
    console.error('[login]', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
