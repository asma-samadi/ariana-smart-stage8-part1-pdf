/** Pure validators. Each returns an error CODE (string) or null. Codes map to i18n keys `auth.errors.*`. */
export const PASSWORD_MIN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizeEmail = (v) => String(v || '').trim().toLowerCase();

export function validateEmail(v) {
  const e = normalizeEmail(v);
  if (!e) return 'emailRequired';
  if (e.length > 254 || !EMAIL_RE.test(e)) return 'emailInvalid';
  return null;
}

export function validatePassword(v) {
  const p = String(v || '');
  if (!p) return 'passwordRequired';
  if (p.length < PASSWORD_MIN) return 'passwordShort';
  if (p.length > 72) return 'passwordLong';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'passwordWeak';
  return null;
}

export function validateConfirm(password, confirm) {
  return password === confirm ? null : 'passwordMismatch';
}

export function validateFullName(v) {
  const n = String(v || '').trim().replace(/\s+/g, ' ');
  if (n.length < 2) return 'nameShort';
  if (n.length > 100) return 'nameLong';
  return null;
}

export const cleanFullName = (v) => String(v || '').trim().replace(/\s+/g, ' ');
