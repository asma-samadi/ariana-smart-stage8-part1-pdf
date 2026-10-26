import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEmail, validatePassword, validateConfirm, validateFullName } from '../src/lib/validation.js';
import { checkSupabaseConfig } from '../src/lib/keySafety.js';
import { mapAuthError } from '../src/lib/authErrors.js';

const jwt = (role) => 'x.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.y';

test('email validation', () => {
  assert.equal(validateEmail(''), 'emailRequired');
  assert.equal(validateEmail('nope'), 'emailInvalid');
  assert.equal(validateEmail('a@b'), 'emailInvalid');
  assert.equal(validateEmail(' User@Example.com '), null);
});
test('password validation', () => {
  assert.equal(validatePassword(''), 'passwordRequired');
  assert.equal(validatePassword('abc12'), 'passwordShort');
  assert.equal(validatePassword('abcdefgh'), 'passwordWeak');
  assert.equal(validatePassword('12345678'), 'passwordWeak');
  assert.equal(validatePassword('a'.repeat(73) + '1'), 'passwordLong');
  assert.equal(validatePassword('goodpass1'), null);
  assert.equal(validateConfirm('a', 'b'), 'passwordMismatch');
  assert.equal(validateConfirm('a', 'a'), null);
});
test('name validation', () => {
  assert.equal(validateFullName(' a '), 'nameShort');
  assert.equal(validateFullName('Test Passenger'), null);
});
test('frontend refuses service-role / secret keys', () => {
  const url = 'https://abc.supabase.co';
  assert.equal(checkSupabaseConfig(url, jwt('service_role')).reason, 'secret_key');
  assert.equal(checkSupabaseConfig(url, 'sb_secret_abc').reason, 'secret_key');
  assert.equal(checkSupabaseConfig(url, jwt('anon')).ok, true);
  assert.equal(checkSupabaseConfig(url, 'sb_publishable_abc').ok, true);
  assert.equal(checkSupabaseConfig('https://YOUR-PROJECT.supabase.co', 'YOUR_PUBLIC_ANON_KEY').reason, 'missing');
  assert.equal(checkSupabaseConfig('http://evil.example', jwt('anon')).reason, 'bad_url');
  assert.equal(checkSupabaseConfig('', '').reason, 'missing');
});
test('auth errors map to safe codes', () => {
  assert.equal(mapAuthError({ message: 'Invalid login credentials' }), 'invalidCredentials');
  assert.equal(mapAuthError({ code: 'user_already_exists' }), 'alreadyRegistered');
  assert.equal(mapAuthError({ status: 429 }), 'rateLimited');
  assert.equal(mapAuthError({ message: 'Failed to fetch' }), 'network');
  assert.equal(mapAuthError({ message: 'secret db detail' }), 'generic');
  assert.equal(mapAuthError({ code: 'same_password', message: 'New password should be different from the old password.' }), 'samePassword');
  assert.equal(mapAuthError({ message: 'Password should be at least 6 characters' }), 'passwordWeak');
  assert.equal(mapAuthError(null), null);
});
