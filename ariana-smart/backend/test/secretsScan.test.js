import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanText, scanDir } from '../scripts/secretsScan.js';

// All fake secrets are assembled at runtime so this file itself never contains a literal secret.
const j = (...p) => p.join('');
const fakeJwt = (role) => [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify({ role })).toString('base64url'), 'sig_sig_sig_sig_sig'].join('.');
const PRIVATE_KEY_LINE = j('-----BEGIN ', 'PRIVATE KEY', '-----');

test('[unit] detects private keys, service-role JWTs, API keys and tokens', () => {
  const cases = {
    'private key block': PRIVATE_KEY_LINE,
    'google service-account JSON fields': j('{"type": "service_', 'account"}'),
    'Supabase service-role JWT': `SUPABASE_KEY=${fakeJwt('service_role')}`,
    'Supabase secret key (sb_secret_)': j('sb_', 'secret_', 'a'.repeat(24)),
    'Google API key': j('AI', 'za', 'B'.repeat(35)),
    'GitHub token': j('gh', 'p_', 'c'.repeat(36)),
    'AWS access key id': j('AK', 'IA', 'D'.repeat(16)),
    'filled GOOGLE_SERVICE_ACCOUNT_JSON_BASE64': 'GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=' + 'Zm9v'.repeat(30),
    'filled SUPABASE_SERVICE_ROLE_KEY': 'SUPABASE_SERVICE_ROLE_KEY=' + 'x'.repeat(40)
  };
  for (const [rule, line] of Object.entries(cases)) assert.ok(scanText(line).some((f) => f.rule === rule), `not detected: ${rule}`);
});
test('[unit] does NOT flag safe content (anon JWT, placeholders, empty template values)', () => {
  const safe = [`VITE_SUPABASE_ANON_KEY=${fakeJwt('anon')}`, 'SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_BACKEND_ONLY', 'GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=', 'const x = "hello";'];
  for (const l of safe) assert.deepEqual(scanText(l), [], l);
});
test('[unit] findings never contain the secret itself', () => {
  const f = scanText(j('sb_', 'secret_', 'TOPSECRETVALUE12345678')); assert.equal(JSON.stringify(f).includes('TOPSECRET'), false);
});
test('[unit] directory scan flags forbidden files, secrets in code, and secret names in frontend code', () => {
  const d = mkdtempSync(join(tmpdir(), 'scan-'));
  try {
    mkdirSync(join(d, 'frontend/src'), { recursive: true }); mkdirSync(join(d, 'backend/src'), { recursive: true }); mkdirSync(join(d, 'node_modules/x'), { recursive: true });
    writeFileSync(join(d, '.env'), 'A=1'); writeFileSync(join(d, '.env.example'), 'A=');
    writeFileSync(join(d, 'backend/key.pem'), 'x'); writeFileSync(join(d, 'service-account-prod.json'), '{}');
    writeFileSync(join(d, 'backend/src/a.js'), `const k='${PRIVATE_KEY_LINE}';`);
    writeFileSync(join(d, 'frontend/src/b.js'), 'const n = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;');
    writeFileSync(join(d, 'node_modules/x/ignored.js'), PRIVATE_KEY_LINE);
    const rules = scanDir(d).map((f) => `${f.file}|${f.rule}`);
    for (const exp of ['.env|real .env file', 'backend/key.pem|private key / certificate file', 'service-account-prod.json|credentials JSON file',
      'backend/src/a.js|private key block', 'frontend/src/b.js|backend-only secret name in frontend code']) assert.ok(rules.includes(exp), `missing: ${exp}\n${rules.join('\n')}`);
    assert.ok(!rules.some((r) => r.startsWith('.env.example')), '.env.example must be allowed');
    assert.ok(!rules.some((r) => r.startsWith('node_modules')), 'node_modules skipped');
  } finally { rmSync(d, { recursive: true, force: true }); }
});
test('[repo] the actual project tree is clean (no credentials, private keys, real .env files)', () => {
  const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  assert.deepEqual(scanDir(root), []);
});
