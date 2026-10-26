/**
 * Document-upload rules. Pure JS, dependency-free.
 * THIS FILE EXISTS IN TWO IDENTICAL COPIES: frontend/src/lib/ and backend/src/lib/ (checked by test/sync.test.js).
 * The browser uses it for instant feedback only; the backend is the real gatekeeper and additionally
 * inspects the file's actual bytes (magic numbers), never trusting the filename or the browser-sent type.
 * Every validator returns an error CODE or null; codes map to i18n keys `documents.errors.*`.
 */
export const DOC_TYPES = ['passport', 'national_id', 'visa', 'supporting'];
export const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
export const EXT_FOR_MIME = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB (backend may lower/raise via MAX_UPLOAD_MB, capped below)
export const HARD_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_DOCS_PER_APPLICATION = 10;
/** Statuses in which a passenger may still add/remove documents. */
export const UPLOADABLE_STATUSES = ['submitted', 'under_review', 'documents_required'];

/** Identify a file by its leading bytes. Returns an allowed MIME type or null. */
export function sniffMime(buf) {
  if (!buf || buf.length < 8) return null;
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d) return 'application/pdf'; // %PDF-
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((b, i) => buf[i] === b)) return 'image/png';
  return null;
}

/** Cheap metadata check usable in the browser before upload (the server repeats and strengthens it). */
export function validateFileMeta({ size, type, docType }, maxBytes = MAX_FILE_BYTES) {
  if (!DOC_TYPES.includes(docType)) return 'docTypeInvalid';
  if (!Number.isFinite(size) || size <= 0) return 'fileEmpty';
  if (size > maxBytes) return 'fileTooLarge';
  if (type && !ALLOWED_MIME.includes(type)) return 'fileType';
  return null;
}

/** Strict UUID shape check so malformed ids never reach the database layer. */
export const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v ?? ''));
