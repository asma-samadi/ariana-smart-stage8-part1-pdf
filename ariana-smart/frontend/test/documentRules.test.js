import test from 'node:test';
import assert from 'node:assert/strict';
import { sniffMime, validateFileMeta, isUuid, DOC_TYPES, MAX_FILE_BYTES } from '../src/lib/documentRules.js';
import en from '../src/i18n/en.js';

test('sniffMime accepts only real PDF/JPEG/PNG bytes', () => {
  assert.equal(sniffMime(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])), 'application/pdf');
  assert.equal(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])), 'image/jpeg');
  assert.equal(sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(sniffMime(new TextEncoder().encode('<svg onload=alert(1)>')), null);
  assert.equal(sniffMime(null), null);
});
test('validateFileMeta', () => {
  assert.equal(validateFileMeta({ size: 1, type: 'image/png', docType: DOC_TYPES[0] }), null);
  assert.equal(validateFileMeta({ size: MAX_FILE_BYTES + 1, type: 'image/png', docType: 'visa' }), 'fileTooLarge');
  assert.equal(validateFileMeta({ size: 1, type: 'application/x-msdownload', docType: 'visa' }), 'fileType');
});
test('isUuid', () => {
  assert.ok(isUuid('11111111-1111-4111-8111-111111111111'));
  assert.ok(!isUuid('../etc/passwd'));
  assert.ok(!isUuid(undefined));
});
test('every document error code and type used by the UI has an English string', () => {
  const codes = ['docTypeInvalid', 'fileMissing', 'fileEmpty', 'fileTooLarge', 'fileType', 'badUpload', 'tooMany', 'applicationClosed', 'notFound', 'sessionExpired', 'network', 'rateLimited', 'serverUnavailable', 'serverError', 'notConfigured'];
  for (const c of codes) assert.ok(en.documents.errors[c], `missing documents.errors.${c}`);
  for (const k of DOC_TYPES) assert.ok(en.documents.types[k], `missing documents.types.${k}`);
});
