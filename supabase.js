// lib/supabase.js  — server-side only. Uses the SERVICE ROLE key (never in the app).

/* Normalise SUPABASE_URL : on tolère une barre oblique finale, des espaces, ou
   un /rest/v1 collé par erreur. Sans ça, une simple barre en trop provoque
   « PGRST125 : Invalid path specified in request URL » sur TOUS les appels. */
function baseUrl(){
  let u = (process.env.SUPABASE_URL || '').trim();
  u = u.replace(/\/+$/, '');            // enlève les barres finales
  u = u.replace(/\/rest\/v1$/, '');     // enlève un /rest/v1 déjà présent
  return u;
}
const URL = baseUrl();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

function headers(extra){
  const h = { apikey: KEY, 'Content-Type': 'application/json' };
  // Les nouvelles clés Supabase (sb_secret_...) ne sont PAS des JWT : on ne les met
  // que dans l'en-tête apikey. Les anciennes clés service_role (eyJ...) vont aussi
  // dans Authorization. Ce test gère automatiquement les deux formats.
  if (KEY && KEY.indexOf('eyJ') === 0) h.Authorization = 'Bearer ' + KEY;
  return Object.assign(h, extra || {});
}

async function getUser(phone){
  const r = await fetch(URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone) + '&select=*', { headers: headers() });
  const rows = await r.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
async function createUser(phone, code){
  const r = await fetch(URL + '/rest/v1/users', {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify({ phone: phone, code: code, data: {}, pro: false }),
  });
  const raw = await r.text();
  let rows = null; try { rows = JSON.parse(raw); } catch (e) {}
  const row = Array.isArray(rows) && rows.length ? rows[0] : null;
  return { ok: r.ok, status: r.status, row: row, raw: raw };
}
async function saveData(phone, data){
  const r = await fetch(URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone), {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify({ data: data, updated_at: new Date().toISOString() }),
  });
  return r.ok;
}
function configured(){ return !!(URL && KEY); }

module.exports = { getUser, createUser, saveData, configured };
