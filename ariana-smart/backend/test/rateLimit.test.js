import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RATE_LIMITS } from '../src/lib/rateLimits.js';

const src = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

test('[config] rate limits are sane: sync is stricter than admin, admin stricter than global', () => {
  const { global, submit, admin, adminSync } = RATE_LIMITS;
  for (const l of [global, submit, admin, adminSync]) { assert.ok(l.windowMs >= 1000); assert.ok(Number.isInteger(l.limit) && l.limit > 0); }
  assert.ok(adminSync.limit < admin.limit && admin.limit < global.limit && submit.limit < global.limit);
});
test('[static] the limits are actually wired into server, applications and admin routes', () => {
  assert.match(src('server.js'), /rateLimit\(RATE_LIMITS\.global\)/);
  assert.match(src('routes/applications.js'), /RATE_LIMITS\.submit/);
  assert.match(src('routes/admin.js'), /RATE_LIMITS\.admin\b/);
  assert.equal((src('routes/admin.js').match(/RATE_LIMITS\.adminSync/g) || []).length, 2); // both sync endpoints
});

// NOTE: a behavioural 429 check needs the real express + express-rate-limit packages (not installable offline).
// Run the manual smoke check in docs/STAGE6_TEST_REPORT.md once the backend is running.
