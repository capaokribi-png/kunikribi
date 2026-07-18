// lib/phone.js — server-side. Normalise l'identifiant de compte.
//
// Deux cas :
//   1) Numéro Cameroun ou Bénin  -> forme canonique (indicatif + numéro).
//      C'est ce qui garantit qu'un éleveur qui tape « 696603209 » et
//      « 237696603209 » retombe sur UN SEUL compte. On ne touche pas à ça :
//      les 12 comptes existants en dépendent.
//   2) Tout le reste (autres pays) -> identifiant libre, juste nettoyé.
//      Pas de normalisation par pays : coder 25 formats est une source de
//      bugs (Gabon, Togo, Sénégal ont des règles piégeuses). L'éleveur choisit
//      son identifiant, son code secret le protège. C'est robuste et ça ouvre
//      les 25 pays de Chariow d'un coup.

function normPhone(input) {
  const brut = String(input == null ? '' : input).trim();
  if (!brut) return null;

  // --- Cas 1 : Cameroun / Bénin, normalisation stricte ---
  let d = brut.replace(/\D/g, '');
  d = d.replace(/^00/, '');
  if (/^237[0-9]{9}$/.test(d))  return d;                     // CM complet
  if (/^229[0-9]{10}$/.test(d)) return d;                     // BJ complet
  if (/^229[0-9]{8}$/.test(d))  return '22901' + d.slice(3);  // BJ ancien 8 ch.
  if (/^6[0-9]{8}$/.test(d))    return '237' + d;             // CM sans indicatif
  if (/^01[0-9]{8}$/.test(d))   return '229' + d;             // BJ sans indicatif

  // --- Cas 2 : autre pays -> identifiant libre ---
  // On accepte lettres, chiffres, + - . et espaces, on ramène en minuscules,
  // on compacte les espaces. 4 à 40 caractères utiles. Deux personnes qui
  // tapent le même identifiant tombent sur le même compte ; c'est le code
  // secret qui protège, exactement comme un couple identifiant/mot de passe.
  const libre = brut.toLowerCase().replace(/\s+/g, ' ').trim();
  const utile = libre.replace(/[^a-z0-9]/g, '');
  if (utile.length < 4 || libre.length > 40) return null;
  return libre;
}

// true si l'identifiant est un numéro CM/BJ normalisé (12 ou 13 chiffres).
// Sert seulement à l'affichage côté client, jamais à la logique de compte.
function estNumeroConnu(id) {
  return /^(237[0-9]{9}|229[0-9]{10})$/.test(String(id || ''));
}

module.exports = { normPhone, estNumeroConnu };
