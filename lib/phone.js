// lib/phone.js — normalisation des numéros (Cameroun + Bénin). Server-side.
//
// Objectif : « 696603209 », « 237696603209 », « +237 696 603 209 » et
// « 00237696603209 » doivent désigner UN SEUL compte. Sans ça, un éleveur qui
// tape son numéro de deux façons se retrouve avec deux comptes et croit avoir
// perdu ses données.
//
// Formats acceptés :
//   Cameroun : 9 chiffres commençant par 6, avec ou sans l'indicatif 237
//   Bénin    : 10 chiffres commençant par 01 (plan ARCEP du 30/11/2024),
//              avec ou sans l'indicatif 229. L'ancien format à 8 chiffres est
//              accepté UNIQUEMENT s'il est précédé de 229 (sinon il serait
//              impossible de le distinguer d'une faute de frappe camerounaise).
//
// Renvoie la forme canonique (indicatif + numéro, chiffres seuls) ou null.

function normPhone(input) {
  let d = String(input == null ? '' : input).replace(/\D/g, ''); // chiffres seuls
  d = d.replace(/^00/, '');                                       // 00237… -> 237…

  if (/^237[0-9]{9}$/.test(d))  return d;                        // Cameroun, complet
  if (/^229[0-9]{10}$/.test(d)) return d;                        // Bénin, complet
  if (/^229[0-9]{8}$/.test(d))  return '22901' + d.slice(3);     // Bénin, ancien 8 ch.
  if (/^6[0-9]{8}$/.test(d))    return '237' + d;                // Cameroun, sans indicatif
  if (/^01[0-9]{8}$/.test(d))   return '229' + d;                // Bénin, sans indicatif

  return null; // on refuse plutôt que de créer un compte fantôme
}

module.exports = { normPhone };
