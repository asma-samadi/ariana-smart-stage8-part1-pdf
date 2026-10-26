import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { createRequireAuth } from './createRequireAuth.js';

export { createRequireAuth };
export const requireAuth = createRequireAuth({ getAdmin: getSupabaseAdmin });
