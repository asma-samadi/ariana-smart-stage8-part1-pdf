import test from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeServiceKey } from '../src/lib/keySafety.js';
const jwt = (role) => 'x.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.y';
test('backend recognises service keys and rejects anon keys', () => {
  assert.equal(looksLikeServiceKey(jwt('service_role')), true);
  assert.equal(looksLikeServiceKey('sb_secret_abc'), true);
  assert.equal(looksLikeServiceKey(jwt('anon')), false);
  assert.equal(looksLikeServiceKey('sb_publishable_abc'), false);
  assert.equal(looksLikeServiceKey(''), false);
});
