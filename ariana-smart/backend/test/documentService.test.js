import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadDocument, listDocuments, getDocumentUrl, deleteDocument, buildStoragePath } from '../src/lib/documentService.js';
import { sniffMime, validateFileMeta } from '../src/lib/documentRules.js';

/** In-memory fake of the Supabase client parts used (tables + storage). NOT a real database or real Storage. */
function fakeAdmin({ apps = [], failInsert = false } = {}) {
  const tables = { applications: apps, application_documents: [] };
  const objects = new Map();
  const pick = (row, cols) => (cols ? Object.fromEntries(cols.split(',').map((c) => c.trim()).map((c) => [c, row[c]])) : row);
  const builder = (name, filters = [], mode = 'select', payload = null, cols = null) => {
    const rows = () => tables[name].filter((r) => filters.every((f) => f(r))).map((r) => pick(r, cols));
    const api = {
      select: (c) => builder(name, filters, mode === 'insert' ? 'insert' : 'select', payload, c),
      eq: (c, v) => builder(name, [...filters, (r) => r[c] === v], mode, payload, cols),
      order: () => api,
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      single: async () => {
        if (failInsert) return { data: null, error: { code: 'XX000', message: 'boom' } };
        const row = { id: `00000000-0000-4000-8000-${String(tables[name].length + 1).padStart(12, '0')}`, created_at: 'now', ...payload };
        tables[name].push(row);
        return { data: pick(row, cols), error: null };
      },
      then: (res) => {
        if (mode === 'delete') { tables[name] = tables[name].filter((r) => !filters.every((f) => f(r))); return res({ error: null }); }
        return res({ data: rows(), error: null });
      }
    };
    return api;
  };
  const storage = { from: () => ({
    upload: async (p, buf, o) => { if (objects.has(p)) return { error: { message: 'exists' } }; objects.set(p, { buf, o }); return { error: null }; },
    remove: async (ps) => { ps.forEach((p) => objects.delete(p)); return { error: null }; },
    createSignedUrl: async (p, s) => (objects.has(p) ? { data: { signedUrl: `https://x.test/sign/${p}?t=1`, s }, error: null } : { data: null, error: { message: 'nf' } })
  }) };
  return {
    tables, objects, storage,
    from: (name) => ({ ...builder(name), insert: (p) => builder(name, [], 'insert', p), delete: () => builder(name, [], 'delete') })
  };
}

const APP_A = '11111111-1111-4111-8111-111111111111';
const APP_B = '22222222-2222-4222-8222-222222222222';
const apps = () => [
  { id: APP_A, user_id: 'user-A', status: 'submitted' },
  { id: APP_B, user_id: 'user-B', status: 'submitted' },
  { id: '33333333-3333-4333-8333-333333333333', user_id: 'user-A', status: 'approved_demo' }
];
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(100, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(50)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(50)]);
const up = (admin, o = {}) => uploadDocument({ admin, bucket: 'b', userId: 'user-A', applicationId: APP_A, docType: 'passport', file: { buffer: PDF }, ...o });

test('sniffMime recognises PDF/JPEG/PNG by content and rejects others', () => {
  assert.equal(sniffMime(PDF), 'application/pdf');
  assert.equal(sniffMime(PNG), 'image/png');
  assert.equal(sniffMime(JPG), 'image/jpeg');
  assert.equal(sniffMime(Buffer.from('<html><script>alert(1)</script>')), null);
  assert.equal(sniffMime(Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00')), null); // Windows executable
  assert.equal(sniffMime(Buffer.alloc(3)), null);
});
test('validateFileMeta (browser-side pre-check)', () => {
  assert.equal(validateFileMeta({ size: 10, type: 'application/pdf', docType: 'passport' }), null);
  assert.equal(validateFileMeta({ size: 10, type: 'text/html', docType: 'passport' }), 'fileType');
  assert.equal(validateFileMeta({ size: 6 * 1024 * 1024, type: 'application/pdf', docType: 'passport' }), 'fileTooLarge');
  assert.equal(validateFileMeta({ size: 0, type: 'application/pdf', docType: 'passport' }), 'fileEmpty');
  assert.equal(validateFileMeta({ size: 5, type: 'image/png', docType: 'x' }), 'docTypeInvalid');
});
test('owner uploads a PDF: stored privately under a server-generated path', async () => {
  const admin = fakeAdmin({ apps: apps() });
  const r = await up(admin);
  assert.equal(r.status, 201);
  const row = admin.tables.application_documents[0];
  assert.equal(row.user_id, 'user-A');
  assert.equal(row.mime_type, 'application/pdf');
  assert.match(row.storage_path, /^user-A\/1{8}-1{4}-4111-8111-1{12}\/[0-9a-f-]{36}\.pdf$/);
  assert.ok(admin.objects.has(row.storage_path));
  assert.equal(r.body.document.storage_path, undefined); // internal path never returned to the browser
});
test('cannot upload to another user\'s application (404, nothing stored)', async () => {
  const admin = fakeAdmin({ apps: apps() });
  const r = await up(admin, { applicationId: APP_B });
  assert.equal(r.status, 404);
  assert.equal(admin.objects.size, 0);
  assert.equal(admin.tables.application_documents.length, 0);
});
test('nonexistent and malformed application ids give the same 404', async () => {
  const admin = fakeAdmin({ apps: apps() });
  assert.equal((await up(admin, { applicationId: '99999999-9999-4999-8999-999999999999' })).status, 404);
  assert.equal((await up(admin, { applicationId: "x' or 1=1 --" })).status, 404);
  assert.equal((await up(admin, { applicationId: '../../etc/passwd' })).status, 404);
});
test('rejects disguised files: HTML/EXE named .pdf, wrong content, claimed type ignored', async () => {
  const admin = fakeAdmin({ apps: apps() });
  const r = await up(admin, { file: { buffer: Buffer.from('<html><script>alert(1)</script></html>'), originalname: 'passport.pdf', mimetype: 'application/pdf' } });
  assert.equal(r.status, 415);
  assert.equal(r.body.code, 'fileType');
  assert.equal(admin.objects.size, 0);
});
test('rejects empty, oversized and bad doc type', async () => {
  const admin = fakeAdmin({ apps: apps() });
  assert.equal((await up(admin, { file: { buffer: Buffer.alloc(0) } })).body.code, 'fileEmpty');
  const big = Buffer.concat([PDF, Buffer.alloc(1024 * 1024)]);
  const r = await up(admin, { file: { buffer: big }, maxBytes: 1024 * 1024 });
  assert.equal(r.status, 413);
  assert.equal((await up(admin, { docType: 'selfie' })).body.code, 'docTypeInvalid');
  assert.equal((await up(admin, { file: undefined })).body.code, 'fileEmpty');
  assert.equal(admin.objects.size, 0);
});
test('maxBytes can never exceed the hard cap', async () => {
  const admin = fakeAdmin({ apps: apps() });
  const huge = Buffer.concat([PDF, Buffer.alloc(11 * 1024 * 1024)]);
  assert.equal((await up(admin, { file: { buffer: huge }, maxBytes: 999 * 1024 * 1024 })).status, 413);
});
test('closed applications (approved/rejected/cancelled) accept no uploads or deletions', async () => {
  const admin = fakeAdmin({ apps: apps() });
  const r = await up(admin, { applicationId: '33333333-3333-4333-8333-333333333333' });
  assert.equal(r.status, 409);
  assert.equal(admin.objects.size, 0);
});
test('per-application document cap', async () => {
  const admin = fakeAdmin({ apps: apps() });
  for (let i = 0; i < 10; i++) assert.equal((await up(admin, { file: { buffer: PNG } })).status, 201);
  assert.equal((await up(admin)).status, 409);
});
test('database failure removes the stored object (no orphan) and propagates', async () => {
  const admin = fakeAdmin({ apps: apps(), failInsert: true });
  await assert.rejects(() => up(admin));
  assert.equal(admin.objects.size, 0);
});
test('list shows only own documents; other user gets 404', async () => {
  const admin = fakeAdmin({ apps: apps() });
  await up(admin, { file: { buffer: JPG }, docType: 'visa' });
  const own = await listDocuments({ admin, userId: 'user-A', applicationId: APP_A });
  assert.equal(own.body.documents.length, 1);
  assert.equal(own.body.documents[0].storage_path, undefined);
  assert.equal((await listDocuments({ admin, userId: 'user-B', applicationId: APP_A })).status, 404);
});
test('signed URL: owner only, 60 s, 404 for others and bad ids', async () => {
  const admin = fakeAdmin({ apps: apps() });
  const id = (await up(admin)).body.document.id;
  const ok = await getDocumentUrl({ admin, bucket: 'b', userId: 'user-A', documentId: id });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.expiresIn, 60);
  assert.equal((await getDocumentUrl({ admin, bucket: 'b', userId: 'user-B', documentId: id })).status, 404);
  assert.equal((await getDocumentUrl({ admin, bucket: 'b', userId: 'user-A', documentId: 'nope' })).status, 404);
});
test('delete: owner removes file+row; others get 404 and nothing changes', async () => {
  const admin = fakeAdmin({ apps: apps() });
  const id = (await up(admin)).body.document.id;
  assert.equal((await deleteDocument({ admin, bucket: 'b', userId: 'user-B', documentId: id })).status, 404);
  assert.equal(admin.objects.size, 1);
  assert.equal((await deleteDocument({ admin, bucket: 'b', userId: 'user-A', documentId: id })).status, 200);
  assert.equal(admin.objects.size, 0);
  assert.equal(admin.tables.application_documents.length, 0);
});
test('storage paths never contain user-supplied names and are unique', () => {
  const a = buildStoragePath('u', 'a', 'image/png');
  const b = buildStoragePath('u', 'a', 'image/png');
  assert.notEqual(a, b);
  assert.match(a, /^u\/a\/[0-9a-f-]{36}\.png$/);
});
