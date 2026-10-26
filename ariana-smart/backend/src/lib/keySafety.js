/**
 * Dependency-free helpers that stop privileged keys from being used in the browser.
 * Pure JS (no Vite/React imports) so they can be unit-tested with `node --test`.
 */

function decodeJwtPayload(token) {
  try {
    const part = String(token).split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const json = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Returns { ok, reason } where reason is an i18n-independent code. */
export function checkSupabaseConfig(url, anonKey) {
  const u = String(url || '').trim();
  const k = String(anonKey || '').trim();
  if (!u || !k || u.includes('YOUR-PROJECT') || k.startsWith('YOUR_')) return { ok: false, reason: 'missing' };
  let parsed;
  try {
    parsed = new URL(u);
  } catch {
    return { ok: false, reason: 'bad_url' };
  }
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !local) return { ok: false, reason: 'bad_url' };
  // New-style secret keys must never reach the browser.
  if (k.startsWith('sb_secret_')) return { ok: false, reason: 'secret_key' };
  const payload = decodeJwtPayload(k);
  if (payload && payload.role === 'service_role') return { ok: false, reason: 'secret_key' };
  return { ok: true, reason: null };
}

/** Backend counterpart: the service key must be a privileged key, not the public anon key. */
export function looksLikeServiceKey(key) {
  const k = String(key || '').trim();
  if (k.startsWith('sb_secret_')) return true;
  const payload = decodeJwtPayload(k);
  return Boolean(payload && payload.role === 'service_role');
}
