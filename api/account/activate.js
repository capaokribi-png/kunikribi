import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // clé "service_role", jamais la clé publique
);

// Limite basique anti-brute-force en mémoire (suffisant pour démarrer)
const tentatives = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'method' });

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const t = tentatives.get(ip) || { n:0, reset: now + 15*60*1000 };
  if (now > t.reset) { t.n = 0; t.reset = now + 15*60*1000; }
  if (t.n >= 5) return res.status(429).json({ ok:false, error:'too_many' });
  t.n++; tentatives.set(ip, t);

  const { code, type, phone } = req.body || {};
  if (!code || !type) return res.status(400).json({ ok:false, error:'missing' });

  const { data, error } = await supabase
    .from('activation_codes')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .eq('type', type)
    .eq('used', false)
    .single();

  if (error || !data) return res.status(200).json({ ok:false, error:'invalid' });

  const exp = new Date(Date.now() + data.duration_days*86400000).toISOString().slice(0,10);

  await supabase.from('activation_codes')
    .update({ used:true, used_by_phone: phone||null, used_at: new Date().toISOString() })
    .eq('code', data.code);

  return res.status(200).json({ ok:true, exp });
}
