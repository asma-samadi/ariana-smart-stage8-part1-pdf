import { createClient } from '@supabase/supabase-js';
import { checkSupabaseConfig } from './keySafety.js';
import { createMockClient } from './mockAuth.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const wantsMock = import.meta.env.DEV && import.meta.env.VITE_AUTH_MOCK === 'true';

/**
 * mode: 'real'          real Supabase project (anon key only)
 *       'mock'          development-only localStorage stand-in (clearly labelled in the UI)
 *       'not_configured' no usable configuration; auth screens explain what to do
 *       'unsafe_key'    a service-role/secret key was found in the frontend config: refuse to use it
 */
function init() {
  if (wantsMock) return { mode: 'mock', client: createMockClient() };
  const check = checkSupabaseConfig(url, anonKey);
  if (check.reason === 'secret_key') return { mode: 'unsafe_key', client: null };
  if (!check.ok) return { mode: 'not_configured', client: null };
  return {
    mode: 'real',
    client: createClient(url.trim(), anonKey.trim(), {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  };
}

const { mode, client } = init();
export const authMode = mode;
export const supabase = client;
