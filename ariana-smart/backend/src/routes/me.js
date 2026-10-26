import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';

const router = Router();

/** Returns the verified caller's identity + role. Role is read server-side, never trusted from the client. */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await getSupabaseAdmin().from('profiles').select('full_name, role').eq('id', req.user.id).maybeSingle();
    if (error) throw error;
    res.json({ id: req.user.id, email: req.user.email, fullName: data?.full_name ?? null, role: data?.role ?? 'user' });
  } catch (e) { next(e); }
});

export default router;
