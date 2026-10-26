import test from 'node:test';
import assert from 'node:assert/strict';
import { createSheetsClient } from '../src/lib/sheetsClient.js';
import { SHEET_HEADERS, toSheetRow, safeCell } from '../src/lib/sheetsRow.js';
import { classifySheetsError, SheetsError } from '../src/lib/sheetsErrors.js';
import { httpErr } from './helpers/fakes.js';

/** Fake with the googleapis `spreadsheets` shape. NOT the real Google API. */
function fakeApi(initial = []) {
  const grid = initial.map((r) => [...r]); const calls = [];
  return {
    grid, calls,
    values: {
      async get({ range }) { calls.push(['get', range]); return { data: { values: range.endsWith('!A:A') ? grid.map((r) => [r[0]]) : grid.slice(0, 1) } }; },
      async update({ requestBody, valueInputOption }) { calls.push(['update', valueInputOption]); grid[0] = requestBody.values[0]; },
      async append({ requestBody, valueInputOption, insertDataOption }) { calls.push(['append', valueInputOption, insertDataOption]); grid.push(requestBody.values[0]); }
    }
  };
}
const cfg = { sheetId: 'S'.repeat(30), tab: "My Tab's" };

test('[mock] empty sheet: header row is written once, then rows append', async () => {
  const api = fakeApi(); const c = createSheetsClient({ config: cfg, api });
  await c.appendRow(['ASM-1']); await c.appendRow(['ASM-2']);
  assert.deepEqual(api.grid[0], SHEET_HEADERS);
  assert.equal(api.calls.filter((x) => x[0] === 'update').length, 1);
  assert.equal(api.grid.length, 3);
});
test('[mock] values are written RAW (formulas never evaluated) and the tab name is quoted/escaped', async () => {
  const api = fakeApi([SHEET_HEADERS]); const c = createSheetsClient({ config: cfg, api });
  await c.appendRow(['x']);
  assert.ok(api.calls.some((x) => x[0] === 'append' && x[1] === 'RAW' && x[2] === 'INSERT_ROWS'));
  assert.ok(api.calls.some((x) => x[0] === 'get' && x[1].startsWith("'My Tab''s'!")));
});
test('[mock] hasReference finds existing references only', async () => {
  const api = fakeApi([SHEET_HEADERS, ['ASM-2026-1001']]); const c = createSheetsClient({ config: cfg, api });
  assert.equal(await c.hasReference('ASM-2026-1001'), true);
  assert.equal(await c.hasReference('ASM-2026-9999'), false);
});
test('[mock] a sheet with a different header is refused (permanent error, nothing written)', async () => {
  const api = fakeApi([['Name', 'Passport']]); const c = createSheetsClient({ config: cfg, api });
  await assert.rejects(() => c.appendRow(['x']), (e) => e instanceof SheetsError && e.code === 'header_mismatch' && !e.transient);
  assert.equal(api.grid.length, 1);
});
test('error classification: transient vs permanent, codes only', () => {
  assert.deepEqual(classifySheetsError(httpErr(429)), { code: 'rate_limited', transient: true });
  assert.deepEqual(classifySheetsError(httpErr(500)), { code: 'google_server_error', transient: true });
  assert.deepEqual(classifySheetsError({ code: 'ECONNRESET' }), { code: 'network_error', transient: true });
  assert.deepEqual(classifySheetsError({ code: 403 }), { code: 'permission_denied', transient: false });
  assert.deepEqual(classifySheetsError(new Error('weird')), { code: 'unknown_error', transient: false });
});
test('row mapping: allow-list only, formula guard', () => {
  const row = toSheetRow({ reference: 'R', full_name: 'N', email: 'e', id_document_number: 'P', passengers: 2, nationality: '=1+1' }, new Date('2026-10-18T00:00:00Z'));
  assert.equal(row.length, SHEET_HEADERS.length);
  assert.ok(!row.join('|').includes('N|') && !row.includes('e') && !row.includes('P'));
  assert.equal(safeCell('@cmd'), "'@cmd"); assert.equal(safeCell(3), 3); assert.equal(safeCell(null), '');
  assert.equal(row[row.length - 1], '2026-10-18T00:00:00.000Z');
});
test('sheet headers contain no sensitive column names', () => {
  assert.ok(!/passport|document|url|token|email|phone|birth|name\b/i.test(SHEET_HEADERS.filter((h) => h !== 'Nationality').join(',')));
});
