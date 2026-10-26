import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../src/lib/applicationService.js';

/** In-memory fake of the parts of the Supabase client the service uses. NOT a real database. */
function fakeAdmin() {
  const rows = [];
  let seq = 1000;
  const ctl = { hideReads: 0 }; // simulate a concurrent request: the first N reads cannot see the other row
  const visible = (filters) => (ctl.hideReads > 0 ? (ctl.hideReads--, []) : rows.filter((r) => filters.every((f) => f(r))));
  const builder = (filters = [], mode = 'select', payload = null) => {
    const api = {
      select: () => builder(filters, mode === 'insert' ? 'insert' : 'select', payload),
      eq: (c, v) => builder([...filters, (r) => r[c] === v], mode, payload),
      in: (c, vs) => builder([...filters, (r) => vs.includes(r[c])], mode, payload),
      limit: () => api,
      maybeSingle: async () => ({ data: visible(filters)[0] ?? null, error: null }),
      single: async () => {
        // emulate: unique(user_id, idempotency_key), defaults for id/reference/created_at, CHECK(consent)
        if (rows.some((r) => r.user_id === payload.user_id && payload.idempotency_key && r.idempotency_key === payload.idempotency_key)) return { data: null, error: { code: '23505' } };
        const row = { id: `id-${rows.length + 1}`, reference: `ASM-2026-${String(seq++).padStart(6, '0')}`, created_at: '2026-10-18T00:00:00Z', ...payload };
        rows.push(row);
        return { data: { id: row.id, reference: row.reference, status: row.status, created_at: row.created_at }, error: null };
      },
      then: (res) => res({ data: visible(filters), error: null })
    };
    return api;
  };
  return { rows, ctl, from: () => ({ ...builder(), insert: (p) => builder([], 'insert', p) }) };
}

const NOW = new Date('2026-10-18T12:00:00Z');
const input = (o = {}) => ({
  fullName: 'Test Passenger', dateOfBirth: '1990-05-20', nationality: 'Testland', email: 't@example.com',
  origin: 'KBL', destination: 'DXB', tripType: 'one_way', departDate: '2026-11-01', passengers: 1, consent: true,
  idempotencyKey: 'k'.repeat(24), ...o
});

test('creates an application with server-controlled fields', async () => {
  const admin = fakeAdmin();
  const r = await createApplication({ admin, userId: 'user-A', now: NOW, input: input({ user_id: 'user-EVIL', status: 'approved_demo', reference: 'HACK' }) });
  assert.equal(r.status, 201);
  assert.match(r.body.application.reference, /^ASM-2026-\d{6}$/);
  const row = admin.rows[0];
  assert.equal(row.user_id, 'user-A');            // from the verified token, not the body
  assert.equal(row.status, 'submitted');          // never taken from the body
  assert.equal(row.consent_accepted, true);
  assert.equal(r.body.application.status, 'submitted');
});
test('rejects invalid input with field codes and writes nothing', async () => {
  const admin = fakeAdmin();
  const r = await createApplication({ admin, userId: 'u', now: NOW, input: input({ consent: false, destination: 'KBL' }) });
  assert.equal(r.status, 400);
  assert.equal(r.body.fields.consent, 'consentRequired');
  assert.equal(r.body.fields.destination, 'sameAirport');
  assert.equal(admin.rows.length, 0);
});
test('idempotent retry returns the same application, no second row', async () => {
  const admin = fakeAdmin();
  const a = await createApplication({ admin, userId: 'u', now: NOW, input: input() });
  const b = await createApplication({ admin, userId: 'u', now: NOW, input: input() });
  assert.equal(b.status, 200);
  assert.equal(b.body.duplicate, true);
  assert.equal(b.body.application.reference, a.body.application.reference);
  assert.equal(admin.rows.length, 1);
});
test('same route/date/person with a new key is refused as a duplicate', async () => {
  const admin = fakeAdmin();
  await createApplication({ admin, userId: 'u', now: NOW, input: input() });
  const r = await createApplication({ admin, userId: 'u', now: NOW, input: input({ idempotencyKey: 'z'.repeat(24) }) });
  assert.equal(r.status, 409);
  assert.equal(admin.rows.length, 1);
});
test('a different user is never matched against someone else’s application', async () => {
  const admin = fakeAdmin();
  const a = await createApplication({ admin, userId: 'user-A', now: NOW, input: input() });
  const b = await createApplication({ admin, userId: 'user-B', now: NOW, input: input() }); // same key + data, other user
  assert.equal(b.status, 201);
  assert.notEqual(a.body.application.reference, b.body.application.reference);
  assert.equal(admin.rows.length, 2);
});
test('concurrent race: unique violation is converted into the original result', async () => {
  const admin = fakeAdmin();
  const first = await createApplication({ admin, userId: 'u', now: NOW, input: input() });
  admin.ctl.hideReads = 2; // the duplicate pre-checks miss the other request's row...
  const r = await createApplication({ admin, userId: 'u', now: NOW, input: input() }); // ...but the INSERT hits the unique index
  assert.equal(r.status, 200);
  assert.equal(r.body.duplicate, true);
  assert.equal(r.body.application.reference, first.body.application.reference);
  assert.equal(admin.rows.length, 1);
});
test('database errors propagate (route turns them into a generic 500)', async () => {
  const admin = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: new Error('db down') }) }) }) }) }) };
  await assert.rejects(() => createApplication({ admin, userId: 'u', now: NOW, input: input() }), /db down/);
});

test('PDF summary query selects only safe fields and enforces verified-user ownership', async () => {
  const calls = [];
  const safeRow = { id: 'app-1', reference: 'ASM-2026-000001', status: 'submitted', origin: 'KBL', destination: 'DXB', trip_type: 'one_way', depart_date: '2026-11-01', return_date: null, passengers: 1, created_at: '2026-10-18T00:00:00Z' };
  const admin = { from: (table) => ({
    select: (columns) => { calls.push(['select', table, columns]); return {
      eq: (column, value) => { calls.push(['eq', column, value]); return {
        eq: (column2, value2) => { calls.push(['eq', column2, value2]); return { maybeSingle: async () => ({ data: value2 === 'user-A' && value === 'app-1' ? safeRow : null, error: null }) }; }
      }; }
    }; }
  }) };
  const { getApplicationPdfSummary } = await import('../src/lib/applicationService.js');
  const allowed = await getApplicationPdfSummary({ admin, userId: 'user-A', applicationId: 'app-1' });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.application.reference, safeRow.reference);
  assert.match(calls[0][2], /reference/);
  assert.doesNotMatch(calls[0][2], /full_name|date_of_birth|phone|id_document_number|email/);
  assert.deepEqual(calls.slice(1), [['eq', 'id', 'app-1'], ['eq', 'user_id', 'user-A']]);
  const denied = await getApplicationPdfSummary({ admin, userId: 'user-B', applicationId: 'app-1' });
  assert.equal(denied.status, 404);
});
