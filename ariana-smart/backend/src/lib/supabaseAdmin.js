import { createClient } from '@supabase/supabase-js';
import { looksLikeServiceKey } from './keySafety.js';

/** Server-side client with the service-role key. NEVER expose this or its key to the browser. */
let client = null;
export function getSupabaseAdmin() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('YOUR-PROJECT') || key.startsWith('YOUR_')) return null;
  if (!looksLikeServiceKey(key)) {
    console.error('SUPABASE_SERVICE_ROLE_KEY does not look like a service-role/secret key (did you paste the anon key?). Refusing to start the admin client.');
    return null;
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
