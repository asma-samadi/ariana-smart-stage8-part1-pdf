import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { createRequireAdmin } from './createRequireAdmin.js';

export { createRequireAdmin };
export const requireAdmin = createRequireAdmin({ getAdmin: getSupabaseAdmin });
