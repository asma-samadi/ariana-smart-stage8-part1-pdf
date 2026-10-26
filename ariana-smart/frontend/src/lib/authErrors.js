/** Maps Supabase/GoTrue errors to safe, translatable codes. Never shows raw server messages. */
export function mapAuthError(error) {
  if (!error) return null;
  const code = String(error.code || '').toLowerCase();
  const msg = String(error.message || '').toLowerCase();
  const status = error.status;
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'invalidCredentials';
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) return 'emailNotConfirmed';
  if (code === 'user_already_exists' || msg.includes('already registered')) return 'alreadyRegistered';
  if (code === 'same_password' || msg.includes('different from the old password')) return 'samePassword';
  if (code === 'weak_password' || msg.includes('password should be')) return 'passwordWeak';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429) return 'rateLimited';
  if (msg.includes('session') && (msg.includes('missing') || msg.includes('expired'))) return 'sessionExpired';
  if (msg.includes('failed to fetch') || msg.includes('network') || error.name === 'AuthRetryableFetchError') return 'network';
  if (code === 'not_configured') return 'notConfigured';
  return 'generic';
}
