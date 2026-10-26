import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSheetsConfig, describeSheetsConfig } from '../src/lib/sheetsConfig.js';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
// Built at runtime so no key-like literal sits in the repository.
const fakeKey = ['-----BEGIN', 'PRIVATE KEY-----\\nFAKE\\n-----END', 'PRIVATE KEY-----\\n'].join(' ');
const creds = { type: 'service_account', client_email: 'sync@example-project.iam.gserviceaccount.com', private_key: fakeKey };
const ID = 'A'.repeat(44);

test('not configured / incomplete / disabled flag', () => {
  assert.equal(loadSheetsConfig({}).reason, 'not_configured');
  assert.equal(loadSheetsConfig({ GOOGLE_SHEETS_ID: ID }).reason, 'incomplete');
  assert.equal(loadSheetsConfig({ GOOGLE_SHEETS_ID: ID, GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: b64(creds), GOOGLE_SHEETS_ENABLED: 'false' }).reason, 'disabled_by_flag');
});
test('valid configuration, default tab, newline repair', () => {
  const c = loadSheetsConfig({ GOOGLE_SHEETS_ID: ID, GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: b64(creds) });
  assert.equal(c.enabled, true); assert.equal(c.tab, 'Applications');
  assert.ok(c.credentials.private_key.includes('\n'));
});
test('bad inputs are rejected with reason codes that contain no secret content', () => {
  const env = { GOOGLE_SHEETS_ID: ID };
  assert.equal(loadSheetsConfig({ ...env, GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: '%%%not-json' }).reason, 'bad_credentials_encoding');
  assert.equal(loadSheetsConfig({ ...env, GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: b64({ type: 'user' }) }).reason, 'bad_credentials_shape');
  assert.equal(loadSheetsConfig({ GOOGLE_SHEETS_ID: 'https://docs.google.com/spreadsheets/d/abc/edit', GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: b64(creds) }).reason, 'bad_sheet_id');
  assert.equal(loadSheetsConfig({ ...env, GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: b64(creds), GOOGLE_SHEETS_TAB: "x'];drop" }).reason, 'bad_tab_name');
});
test('the public summary never contains credentials or the sheet id', () => {
  const c = loadSheetsConfig({ GOOGLE_SHEETS_ID: ID, GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: b64(creds) });
  const s = JSON.stringify(describeSheetsConfig(c));
  assert.equal(s, '{"configured":true}');
  assert.ok(!s.includes(ID) && !s.includes('FAKE') && !s.includes('example-project'));
});
