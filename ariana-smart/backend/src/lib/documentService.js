import { randomUUID } from 'node:crypto';
import {
  DOC_TYPES, EXT_FOR_MIME, HARD_MAX_FILE_BYTES, MAX_DOCS_PER_APPLICATION, UPLOADABLE_STATUSES, isUuid, sniffMime
} from './documentRules.js';

const APP_COLS = 'id, user_id, status';
const DOC_COLS = 'id, application_id, doc_type, mime_type, size_bytes, created_at';
export const SIGNED_URL_SECONDS = 60;

/**
 * Ownership gate used by EVERY document operation. The service-role client bypasses RLS, so this code is
 * the access control. A missing application and someone else's application give the SAME answer (404)
 * so ids cannot be probed.
 */
async function loadOwnedApplication(admin, userId, applicationId) {
  if (!isUuid(applicationId)) return { fail: { status: 404, body: { error: 'not_found' } } };
  const r = await admin.from('applications').select(APP_COLS).eq('id', applicationId).eq('user_id', userId).maybeSingle();
  if (r.error) throw r.error;
  if (!r.data || r.data.user_id !== userId) return { fail: { status: 404, body: { error: 'not_found' } } };
  return { app: r.data };
}

/** Server-generated object key. The user's filename is never used, so no path traversal or overwrite is possible. */
export const buildStoragePath = (userId, applicationId, mime) => `${userId}/${applicationId}/${randomUUID()}.${EXT_FOR_MIME[mime]}`;

export async function listDocuments({ admin, userId, applicationId }) {
  const own = await loadOwnedApplication(admin, userId, applicationId);
  if (own.fail) return own.fail;
  const r = await admin.from('application_documents').select(DOC_COLS).eq('application_id', applicationId).eq('user_id', userId).order('created_at', { ascending: true });
  if (r.error) throw r.error;
  return { status: 200, body: { documents: r.data || [] } };
}

/**
 * Upload one document. `file` = { buffer, size } from multer memory storage (already capped by multer).
 * Checks, in order: ownership -> application state -> doc type -> size -> real content type -> per-application cap,
 * then stores in the PRIVATE bucket and records metadata; if the DB insert fails the object is removed again.
 */
export async function uploadDocument({ admin, bucket, userId, applicationId, docType, file, maxBytes = 5 * 1024 * 1024 }) {
  const own = await loadOwnedApplication(admin, userId, applicationId);
  if (own.fail) return own.fail;
  if (!UPLOADABLE_STATUSES.includes(own.app.status)) return { status: 409, body: { error: 'application_closed' } };
  if (!DOC_TYPES.includes(docType)) return { status: 400, body: { error: 'validation_failed', code: 'docTypeInvalid' } };
  if (!file || !file.buffer || file.buffer.length === 0) return { status: 400, body: { error: 'validation_failed', code: 'fileEmpty' } };
  const limit = Math.min(maxBytes, HARD_MAX_FILE_BYTES);
  if (file.buffer.length > limit) return { status: 413, body: { error: 'validation_failed', code: 'fileTooLarge' } };
  const mime = sniffMime(file.buffer); // real content, not the filename or the browser's claim
  if (!mime) return { status: 415, body: { error: 'validation_failed', code: 'fileType' } };

  const count = await admin.from('application_documents').select('id').eq('application_id', applicationId).eq('user_id', userId);
  if (count.error) throw count.error;
  if ((count.data || []).length >= MAX_DOCS_PER_APPLICATION) return { status: 409, body: { error: 'too_many_documents' } };

  const path = buildStoragePath(userId, applicationId, mime);
  const up = await admin.storage.from(bucket).upload(path, file.buffer, { contentType: mime, upsert: false });
  if (up.error) throw up.error;

  const ins = await admin.from('application_documents').insert({
    application_id: applicationId, user_id: userId, doc_type: docType, storage_path: path, mime_type: mime, size_bytes: file.buffer.length
  }).select(DOC_COLS).single();
  if (ins.error) {
    await admin.storage.from(bucket).remove([path]).catch(() => {}); // no orphaned private file
    throw ins.error;
  }
  return { status: 201, body: { document: ins.data } };
}

/** Short-lived signed URL, only for the owner of the document. */
export async function getDocumentUrl({ admin, bucket, userId, documentId }) {
  if (!isUuid(documentId)) return { status: 404, body: { error: 'not_found' } };
  const r = await admin.from('application_documents').select('id, storage_path, user_id').eq('id', documentId).eq('user_id', userId).maybeSingle();
  if (r.error) throw r.error;
  if (!r.data || r.data.user_id !== userId) return { status: 404, body: { error: 'not_found' } };
  const s = await admin.storage.from(bucket).createSignedUrl(r.data.storage_path, SIGNED_URL_SECONDS);
  if (s.error || !s.data?.signedUrl) throw s.error || new Error('signed url failed');
  return { status: 200, body: { url: s.data.signedUrl, expiresIn: SIGNED_URL_SECONDS } };
}

export async function deleteDocument({ admin, bucket, userId, documentId }) {
  if (!isUuid(documentId)) return { status: 404, body: { error: 'not_found' } };
  const r = await admin.from('application_documents').select('id, application_id, storage_path, user_id').eq('id', documentId).eq('user_id', userId).maybeSingle();
  if (r.error) throw r.error;
  if (!r.data || r.data.user_id !== userId) return { status: 404, body: { error: 'not_found' } };
  const own = await loadOwnedApplication(admin, userId, r.data.application_id);
  if (own.fail) return own.fail;
  if (!UPLOADABLE_STATUSES.includes(own.app.status)) return { status: 409, body: { error: 'application_closed' } };
  const rm = await admin.storage.from(bucket).remove([r.data.storage_path]);
  if (rm.error) throw rm.error;
  const del = await admin.from('application_documents').delete().eq('id', documentId).eq('user_id', userId);
  if (del.error) throw del.error;
  return { status: 200, body: { deleted: true } };
}
