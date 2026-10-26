import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../src/lib/applicationService.js';

// Minimal fake (same idea as applicationService.test.js) to prove WHEN the Sheets hook fires.
function fakeAdmin() {
  const rows = [];
  const builder = (filters = [], payload = null) => {
    const api = {
      select: () => api, limit: () => api,
      eq: (c, v) => builder([...filters, (r) => r[c] === v], payload),
      in: (c, vs) => builder([...filters, (r) => vs.includes(r[c])], payload),
      maybeSingle: async () => ({ data: rows.filter((r) => filters.every((f) => f(r)))[0] ?? null, error: null }),
      single: async () => {
        if (rows.some((r) => r.user_id === payload.user_id && r.idempotency_key === payload.idempotency_key)) return { data: null, error: { code: '23505' } };
        const row = { id: `id-${rows.length + 1}`, reference: `ASM-2026-${1000 + rows.length}`, created_at: 'x', ...payload }; rows.push(row);
        return { data: { id: row.id, reference: row.reference, status: row.status, created_at: row.created_at }, error: null };
      },
      then: (res) => res({ data: rows.filter((r) => filters.every((f) => f(r))), error: null })
    };
    return api;
  };
  return { rows, from: () => ({ ...builder(), insert: (p) => builder([], p) }) };
}
const NOW = new Date('2026-10-18T12:00:00Z');
const input = (o = {}) => ({ fullName: 'Test Passenger', dateOfBirth: '1990-05-20', nationality: 'Testland', email: 't@example.com', origin: 'KBL', destination: 'DXB', tripType: 'one_way', departDate: '2026-11-01', passengers: 1, consent: true, idempotencyKey: 'k'.repeat(24), ...o });

test('[mock] a NEW application triggers the sync hook exactly once, with only its id', async () => {
  const admin = fakeAdmin(); const seen = [];
  const r = await createApplication({ admin, userId: 'u', now: NOW, input: input(), onCreated: (...a) => seen.push(a) });
  assert.equal(r.status, 201);
  assert.deepEqual(seen, [['id-1']]);
});
test('[mock] idempotent replay (200) and duplicate (409) never trigger the hook', async () => {
  const admin = fakeAdmin(); const seen = [];
  const hook = (id) => seen.push(id);
  await createApplication({ admin, userId: 'u', now: NOW, input: input(), onCreated: hook });
  const replay = await createApplication({ admin, userId: 'u', now: NOW, input: input(), onCreated: hook });
  const dup = await createApplication({ admin, userId: 'u', now: NOW, input: input({ idempotencyKey: 'z'.repeat(24) }), onCreated: hook });
  assert.equal(replay.status, 200); assert.equal(dup.status, 409);
  assert.equal(seen.length, 1);
});
test('[mock] a validation failure never triggers the hook', async () => {
  const seen = [];
  const r = await createApplication({ admin: fakeAdmin(), userId: 'u', now: NOW, input: input({ consent: false }), onCreated: (id) => seen.push(id) });
  assert.equal(r.status, 400); assert.equal(seen.length, 0);
});
test('[mock] a crashing hook can never break or change the user\'s result', async () => {
  const admin = fakeAdmin();
  const r = await createApplication({ admin, userId: 'u', now: NOW, input: input(), onCreated: () => { throw new Error('sheets down'); } });
  assert.equal(r.status, 201); assert.equal(admin.rows.length, 1);
});
test('[mock] without a hook (Sheets not configured) creation is unchanged', async () => {
  const r = await createApplication({ admin: fakeAdmin(), userId: 'u', now: NOW, input: input() });
  assert.equal(r.status, 201);
});
