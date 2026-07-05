// lib/supabase.js  — server-side only. Uses the SERVICE ROLE key (never in the app).
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  const rows = await r.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
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
