import test from 'node:test';
import assert from 'node:assert/strict';
import { syncApplication, syncPending, withRetry, syncStatusCounts } from '../src/lib/sheetsSync.js';
import { SHEET_HEADERS } from '../src/lib/sheetsRow.js';
import { fakeDb, fakeSheets, httpErr, noSleep } from './helpers/fakes.js';

const retry = { sleep: noSleep };

test('[mock] successful sync appends one safe row and marks the database row synced', async () => {
  const admin = fakeDb([{}]); const sheets = fakeSheets();
  const r = await syncApplication({ admin, sheets, applicationId: 'id-1', retry });
  assert.equal(r.result, 'synced');
  assert.equal(sheets.sheet.appended.length, 1);
  assert.equal(admin.rows[0].sheet_sync_status, 'synced');
  assert.ok(admin.rows[0].sheet_synced_at);
  assert.equal(admin.rows[0].sheet_sync_error, null);
  assert.equal(sheets.sheet.appended[0].length, SHEET_HEADERS.length);
});

test('[mock] NO sensitive data reaches the sheet (name, email, phone, DOB, id number, user id, key)', async () => {
  const admin = fakeDb([{}]); const sheets = fakeSheets();
  await syncApplication({ admin, sheets, applicationId: 'id-1', retry });
  const flat = JSON.stringify(sheets.sheet.appended);
  for (const secret of ['Sample Person', 'sample@example.com', '+000 000 0000', 'SAMPLE12345', '1990-01-01', 'user-1', 'kkkkkkkk']) {
    assert.ok(!flat.includes(secret), `leaked: ${secret}`);
  }
});

test('[mock] sheet cells cannot start a spreadsheet formula', async () => {
  const admin = fakeDb([{ nationality: '=HYPERLINK("http://evil","x")' }]); const sheets = fakeSheets();
  await syncApplication({ admin, sheets, applicationId: 'id-1', retry });
  assert.ok(sheets.sheet.appended[0][9].startsWith("'="));
});

test('[mock] duplicate sync: running the same application twice appends once', async () => {
  const admin = fakeDb([{}]); const sheets = fakeSheets();
  const a = await syncApplication({ admin, sheets, applicationId: 'id-1', retry });
  const b = await syncApplication({ admin, sheets, applicationId: 'id-1', retry });
  assert.equal(a.result, 'synced'); assert.equal(b.result, 'not_claimed');
  assert.equal(sheets.sheet.appended.length, 1);
});

test('[mock] duplicate sync: two CONCURRENT workers append once (atomic claim)', async () => {
  const admin = fakeDb([{}]); const sheets = fakeSheets({ delay: true });
  const rs = await Promise.all([1, 2, 3].map(() => syncApplication({ admin, sheets, applicationId: 'id-1', retry })));
  assert.equal(rs.filter((r) => r.result === 'synced').length, 1);
  assert.equal(rs.filter((r) => r.result === 'not_claimed').length, 2);
  assert.equal(sheets.sheet.appended.length, 1);
});

test('[mock] crash after append but before DB update: retry finds the reference in the sheet and does not append again', async () => {
  const admin = fakeDb([{}]); const sheets = fakeSheets();
  await syncApplication({ admin, sheets, applicationId: 'id-1', retry });
  Object.assign(admin.rows[0], { sheet_sync_status: 'failed' }); // simulate the lost DB update
  const r = await syncApplication({ admin, sheets, applicationId: 'id-1', retry });
  assert.equal(r.result, 'already_in_sheet');
  assert.equal(sheets.sheet.appended.length, 1);
  assert.equal(admin.rows[0].sheet_sync_status, 'synced');
});

test('[mock] an abandoned claim (>5 min old) can be taken again; a fresh one cannot', async () => {
  const admin = fakeDb([{}, {}]); const sheets = fakeSheets();
  admin.rows[0].sheet_sync_status = 'syncing'; admin.rows[0].sheet_sync_started_at = Date.now() - 6 * 60_000;
  admin.rows[1].sheet_sync_status = 'syncing'; admin.rows[1].sheet_sync_started_at = Date.now() - 10_000;
  assert.equal((await syncApplication({ admin, sheets, applicationId: 'id-1', retry })).result, 'synced');
  assert.equal((await syncApplication({ admin, sheets, applicationId: 'id-2', retry })).result, 'not_claimed');
});

test('[mock] transient Google errors (429, 503, network) are retried and then succeed', async () => {
  const admin = fakeDb([{}]); const sheets = fakeSheets({ failures: [httpErr(429), httpErr(503)] });
  const r = await syncApplication({ admin, sheets, applicationId: 'id-1', retry });
  assert.equal(r.result, 'synced');
  assert.equal(sheets.sheet.appended.length, 1);
});

test('[mock] retries use exponential backoff and stop at maxAttempts', async () => {
  const delays = []; let calls = 0;
  await assert.rejects(() => withRetry(async () => { calls++; throw httpErr(503); }, { maxAttempts: 3, baseDelayMs: 100, sleep: async (ms) => delays.push(ms) }));
  assert.equal(calls, 3);
  assert.deepEqual(delays, [100, 200]);
});

test('[mock] persistent transient failure ends as failed with a short code and can be retried later', async () => {
  const admin = fakeDb([{}]); const sheets = fakeSheets({ failures: [httpErr(503), httpErr(503), httpErr(503)] });
  const r = await syncApplication({ admin, sheets, applicationId: 'id-1', retry });
  assert.equal(r.result, 'failed'); assert.equal(r.code, 'google_server_error');
  assert.equal(admin.rows[0].sheet_sync_status, 'failed');
  assert.equal(admin.rows[0].sheet_sync_error, 'google_server_error');
  const again = await syncApplication({ admin, sheets, applicationId: 'id-1', retry }); // failures exhausted -> works now
  assert.equal(again.result, 'synced');
  assert.equal(sheets.sheet.appended.length, 1);
});

test('[mock] permanent errors (403 not shared, 404, 401, 400) are NOT retried', async () => {
  for (const [status, code] of [[403, 'permission_denied'], [404, 'sheet_not_found'], [401, 'auth_failed'], [400, 'bad_request']]) {
    const admin = fakeDb([{}]); const sheets = fakeSheets({ failures: [httpErr(status)] });
    const r = await syncApplication({ admin, sheets, applicationId: 'id-1', retry });
    assert.equal(r.code, code);
    assert.equal(sheets.sheet.calls, 1, `status ${status} must not be retried`);
    assert.equal(admin.rows[0].sheet_sync_status, 'failed');
  }
});

test('[mock] raw upstream error text is never stored in the database or logged', async () => {
  const logs = []; const orig = { e: console.error, l: console.log, w: console.warn };
  console.error = console.log = console.warn = (...a) => logs.push(a.join(' '));
  try {
    const admin = fakeDb([{}]); const sheets = fakeSheets({ failures: [httpErr(403)] });
    await syncApplication({ admin, sheets, applicationId: 'id-1', retry });
    assert.ok(!JSON.stringify(admin.rows).includes('SHOULD-NOT-LEAK'));
    assert.ok(!logs.join('\n').includes('SHOULD-NOT-LEAK'));
  } finally { Object.assign(console, { error: orig.e, log: orig.l, warn: orig.w }); }
});

test('[mock] without Sheets configured the application is marked disabled (app keeps working), later retry works', async () => {
  const admin = fakeDb([{}]);
  assert.equal((await syncApplication({ admin, sheets: null, applicationId: 'id-1' })).result, 'disabled');
  assert.equal(admin.rows[0].sheet_sync_status, 'disabled');
  const sheets = fakeSheets();
  const s = await syncPending({ admin, sheets, retry });
  assert.equal(s.synced, 1);
  assert.equal(admin.rows[0].sheet_sync_status, 'synced');
});

test('[mock] syncPending: only unsynced rows, running it twice does not duplicate, counts are correct', async () => {
  const admin = fakeDb([{}, {}, { sheet_sync_status: 'synced' }]); const sheets = fakeSheets();
  const a = await syncPending({ admin, sheets, retry });
  const b = await syncPending({ admin, sheets, retry });
  assert.equal(a.attempted, 2); assert.equal(a.synced, 2);
  assert.equal(b.attempted, 0);
  assert.equal(sheets.sheet.appended.length, 2);
  assert.deepEqual(await syncStatusCounts({ admin }), { pending: 0, syncing: 0, synced: 3, failed: 0, disabled: 0 });
});

test('[mock] syncPending stops early on a configuration error (does not hammer Google)', async () => {
  const admin = fakeDb([{}, {}, {}]); const sheets = fakeSheets({ failures: [httpErr(403)] });
  const s = await syncPending({ admin, sheets, retry });
  assert.equal(s.attempted, 1); assert.equal(s.failed, 1);
});

test('[mock] malformed ids are rejected before touching the database', async () => {
  const admin = fakeDb([{}]);
  assert.equal((await syncApplication({ admin, sheets: fakeSheets(), applicationId: "x'; drop table--" })).result, 'invalid_id');
  assert.equal(admin.ctl.rpcCalls, 0);
});
