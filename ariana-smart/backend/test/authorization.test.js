import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequireAuth } from '../src/middleware/createRequireAuth.js';
import { createRequireAdmin } from '../src/middleware/createRequireAdmin.js';
import { createAdminHandlers } from '../src/lib/adminHandlers.js';
import { fakeDb, fakeSheets } from './helpers/fakes.js';

/** IN-MEMORY fakes of Supabase Auth + profiles. No real Supabase, express or HTTP is involved. */
const TOKENS = { 'token-admin': { id: 'u-admin', email: 'a@example.com' }, 'token-user': { id: 'u-user', email: 'u@example.com' }, 'token-nobody': { id: 'u-noprofile', email: 'n@example.com' } };
const ROLES = { 'u-admin': 'admin', 'u-user': 'user' };
function fakeAuthAdmin({ profileError = false } = {}) {
  return {
    auth: { async getUser(t) { return TOKENS[t] ? { data: { user: TOKENS[t] }, error: null } : { data: null, error: new Error('bad') }; } },
    profiles() {
      let id; const q = { select: () => q, eq: (_c, v) => { id = v; return q; }, maybeSingle: async () => (profileError ? { data: null, error: new Error('db down') } : { data: ROLES[id] ? { role: ROLES[id] } : null, error: null }) };
      return q;
    }
  };
}
function makeAdmin(opts) {
  const base = fakeDb([{}]); const a = fakeAuthAdmin(opts);
  return { ...base, auth: a.auth, from: (t) => (t === 'profiles' ? a.profiles() : base.from(t)), rpc: base.rpc, rows: base.rows };
}

const mkRes = () => { const r = { code: 200, body: undefined, status(c) { r.code = c; return r; }, json(b) { r.body = b; r.done = true; return r; } }; return r; };
const mkReq = (token, extra = {}) => ({ get: (h) => (h.toLowerCase() === 'authorization' && token ? `Bearer ${token}` : ''), body: {}, params: {}, query: {}, ...extra });

/** Runs a middleware chain like express would: stops as soon as a middleware responds. */
async function run(chain, req) {
  const res = mkRes(); let i = 0; let reached = false;
  const next = async (err) => { if (err) { res.code = 500; res.body = { error: 'Internal server error' }; return; } const fn = chain[i++]; if (!fn) { reached = true; return; } await fn(req, res, next); };
  await next();
  return { res, reached };
}

function setup(opts) {
  const admin = makeAdmin(opts); const sheets = fakeSheets();
  const requireAuth = createRequireAuth({ getAdmin: () => admin });
  const requireAdmin = createRequireAdmin({ getAdmin: () => admin });
  const h = createAdminHandlers({ getAdmin: () => admin, getSheets: async () => sheets, describe: () => ({ configured: true }) });
  const endpoints = { 'GET /sheets/status': h.status, 'POST /sheets/sync': h.syncAll, 'POST /sheets/sync/:id': h.syncOne };
  return { admin, sheets, chain: (handler) => [requireAuth, requireAdmin, handler], endpoints };
}

test('[mock] ordinary user gets 403 on EVERY administrator endpoint and nothing runs', async () => {
  const { chain, endpoints, sheets, admin } = setup();
  for (const [name, handler] of Object.entries(endpoints)) {
    const { res, reached } = await run(chain(handler), mkReq('token-user', { params: { id: 'id-1' } }));
    assert.equal(res.code, 403, name); assert.equal(reached, false, name);
  }
  assert.equal(sheets.sheet.appended.length, 0);
  assert.equal(admin.rows[0].sheet_sync_status, 'pending');
});
test('[mock] no token, bad token, and user without a profile are refused (401/401/403)', async () => {
  const { chain, endpoints } = setup();
  const h = endpoints['GET /sheets/status'];
  assert.equal((await run(chain(h), mkReq(null))).res.code, 401);
  assert.equal((await run(chain(h), mkReq('forged-token'))).res.code, 401);
  assert.equal((await run(chain(h), mkReq('token-nobody'))).res.code, 403);
});
test('[mock] a client cannot claim admin through body, query, headers or user id', async () => {
  const { chain, endpoints } = setup();
  const req = mkReq('token-user', { body: { role: 'admin', user: { role: 'admin' } }, query: { role: 'admin' } });
  const orig = req.get; req.get = (h) => (h.toLowerCase() === 'x-role' ? 'admin' : orig(h));
  assert.equal((await run(chain(endpoints['GET /sheets/status']), req)).res.code, 403);
});
test('[mock] the administrator is allowed and gets data', async () => {
  const { chain, endpoints } = setup();
  const s = await run(chain(endpoints['GET /sheets/status']), mkReq('token-admin'));
  assert.equal(s.res.code, 200); assert.equal(s.res.body.counts.pending, 1);
  const y = await run(chain(endpoints['POST /sheets/sync']), mkReq('token-admin'));
  assert.equal(y.res.code, 200); assert.equal(y.res.body.synced, 1);
});
test('[mock] admin sync-one: invalid id -> 404, valid id works', async () => {
  const { chain, endpoints } = setup();
  assert.equal((await run(chain(endpoints['POST /sheets/sync/:id']), mkReq('token-admin', { params: { id: '../../etc' } }))).res.code, 404);
});
test('[mock] authorization FAILS CLOSED when the role lookup breaks or Supabase is missing', async () => {
  const broken = setup({ profileError: true });
  const r1 = await run(broken.chain(broken.endpoints['GET /sheets/status']), mkReq('token-admin'));
  assert.equal(r1.res.code, 503); assert.equal(r1.reached, false);
  const none = createRequireAdmin({ getAdmin: () => null });
  const res = mkRes(); await none({ user: { id: 'x' } }, res, () => assert.fail('must not pass'));
  assert.equal(res.code, 503);
  const res2 = mkRes(); await createRequireAdmin({ getAdmin: () => ({}) })({}, res2, () => assert.fail('must not pass'));
  assert.equal(res2.code, 401);
});
test('[mock] no handler leaks raw rows, credentials or personal data in its response', async () => {
  const { chain, endpoints } = setup();
  for (const [name, h] of Object.entries(endpoints)) {
    const { res } = await run(chain(h), mkReq('token-admin', { params: { id: 'id-1' } }));
    assert.ok(!/Sample Person|sample@example|SAMPLE12345/.test(JSON.stringify(res.body)), name);
  }
});

// Static guard against someone adding an unprotected admin route later (the real express router is not executed here).
test('[static] routes/admin.js applies rate limit + requireAuth + requireAdmin BEFORE any route, and server mounts it', () => {
  const src = readFileSync(new URL('../src/routes/admin.js', import.meta.url), 'utf8');
  const useAt = src.search(/router\.use\(.*requireAuth,\s*requireAdmin\)/);
  const firstRoute = src.search(/router\.(get|post|put|patch|delete|all)\(/);
  assert.ok(useAt >= 0, 'router.use(..., requireAuth, requireAdmin) missing');
  assert.ok(useAt < firstRoute, 'protection must come before the first route');
  assert.ok(src.indexOf('requireAuth') < src.indexOf('requireAdmin') || /requireAuth,\s*requireAdmin/.test(src));
  const server = readFileSync(new URL('../src/server.js', import.meta.url), 'utf8');
  assert.match(server, /app\.use\('\/api\/admin', adminRoutes\)/);
});
test('[static] no admin route exists outside routes/admin.js', () => {
  for (const f of ['applications', 'documents', 'me']) {
    assert.ok(!/['"`]\/admin/.test(readFileSync(new URL(`../src/routes/${f}.js`, import.meta.url), 'utf8')), f);
  }
});
