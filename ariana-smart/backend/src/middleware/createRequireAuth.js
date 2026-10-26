/**
 * Verifies the user's Supabase access token (Authorization: Bearer <jwt>) with Supabase itself,
 * then attaches { id, email } to req.user. Protected routes added in later stages use this.
 */
export const createRequireAuth = ({ getAdmin }) => async function requireAuth(req, res, next) {
  const admin = getAdmin();
  if (!admin) return res.status(503).json({ error: 'Authentication service not configured' });
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid or expired token' });
    req.user = { id: data.user.id, email: data.user.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
