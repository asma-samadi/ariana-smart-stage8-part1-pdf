/**
 * Administrator-only gate. MUST run after requireAuth.
 * The role is read from the database (profiles.role) for the VERIFIED user id on every request:
 * it is never taken from the request body, query, headers, or token claims the client could influence.
 * Fails CLOSED: any error or missing configuration denies access.
 */
export const createRequireAdmin = ({ getAdmin }) => async function requireAdmin(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ error: 'Missing token' });
  const admin = getAdmin();
  if (!admin) return res.status(503).json({ error: 'Authorization service not configured' });
  try {
    const { data, error } = await admin.from('profiles').select('role').eq('id', req.user.id).maybeSingle();
    if (error) throw error;
    if (data?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    return next();
  } catch {
    return res.status(503).json({ error: 'Authorization check unavailable' });
  }
};
