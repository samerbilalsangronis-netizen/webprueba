'use strict';
function publicConfig(env) {
  const url = (env.SUPABASE_URL || '').trim();
  const key = (env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || '').trim();
  if (!url && !key) return {configured:false};
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('Invalid public configuration'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error('Invalid public configuration');
  let safeKey = key.startsWith('sb_publishable_');
  if (!safeKey) {
    try { safeKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role === 'anon'; } catch { safeKey = false; }
  }
  // Nunca publicar una service_role o una sb_secret_, incluso si se configura por error.
  if (!safeKey) throw new Error('Invalid public configuration');
  return {configured:true,url:parsed.origin,key};
}
function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({error:'Method not allowed'}); }
  try { return res.status(200).json(publicConfig(process.env)); }
  catch { return res.status(503).json({error:'La configuración pública de Supabase está incompleta o no es válida.'}); }
}
module.exports = handler;
module.exports.publicConfig = publicConfig;
