import { supabase, authMode } from './supabase.js';
import { mockSubmitApplication, mockDocuments } from './mockAuth.js';

const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');

/** Calls the Ariana Smart backend with the user's access token. Never sends a user id: the server derives it. */
async function request(path, body, { method = 'POST', form = null } = {}) {
  if (!supabase) return { ok: false, status: 0, code: 'notConfigured' };
  let token;
  try {
    token = (await supabase.auth.getSession()).data.session?.access_token;
  } catch { /* fall through */ }
  if (!token) return { ok: false, status: 401, code: 'sessionExpired' };
  let res;
  try {
    const headers = { Authorization: `Bearer ${token}` };
    if (!form && body !== undefined) headers['Content-Type'] = 'application/json'; // for multipart the browser sets the boundary itself
    res = await fetch(`${BASE}${path}`, { method, headers, body: form || (body === undefined ? undefined : JSON.stringify(body)) });
  } catch {
    return { ok: false, status: 0, code: 'network' };
  }
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error page */ }
  return { ok: res.ok, status: res.status, data };
}

/** Result: { ok, application, duplicate } or { ok:false, code, fields?, reference? } where code is an i18n key under apply.errors. */
export async function submitApplication(input) {
  const raw = authMode === 'mock' ? await mockSubmitApplication(input).then((b) => ({ ok: b.status < 300, status: b.status, data: b.body })) : await request('/api/applications', input);
  if (raw.code) return { ok: false, code: raw.code };
  if (raw.ok) return { ok: true, application: raw.data.application, duplicate: Boolean(raw.data.duplicate) };
  if (raw.status === 400 && raw.data?.fields) return { ok: false, code: 'validation', fields: raw.data.fields };
  if (raw.status === 409) return { ok: false, code: 'duplicate', reference: raw.data?.reference };
  if (raw.status === 401) return { ok: false, code: 'sessionExpired' };
  if (raw.status === 429) return { ok: false, code: 'rateLimited' };
  if (raw.status === 503) return { ok: false, code: 'serverUnavailable' };
  return { ok: false, code: 'serverError' };
}

// ---------------------------------------------------------------------------------------------
// Stage 5: private documents. The browser never talks to Storage directly and never sends a user id.
// ---------------------------------------------------------------------------------------------
const docError = (raw) => {
  if (raw.code) return raw.code;
  if (raw.status === 401) return 'sessionExpired';
  if (raw.status === 404) return 'notFound';
  if (raw.status === 409) return raw.data?.error === 'too_many_documents' ? 'tooMany' : 'applicationClosed';
  if (raw.status === 413) return 'fileTooLarge';
  if (raw.status === 415) return 'fileType';
  if (raw.status === 400 && raw.data?.code) return raw.data.code;
  if (raw.status === 429) return 'rateLimited';
  if (raw.status === 503) return 'serverUnavailable';
  return 'serverError';
};
const mockOrReal = (mockFn, path, opts) => (authMode === 'mock' ? mockFn() : request(path, undefined, opts));

export async function listDocuments(applicationId) {
  const raw = await mockOrReal(() => mockDocuments.list(applicationId), `/api/applications/${encodeURIComponent(applicationId)}/documents`, { method: 'GET' });
  return raw.ok ? { ok: true, documents: raw.data.documents } : { ok: false, code: docError(raw) };
}

export async function uploadDocument(applicationId, docType, file) {
  const form = new FormData();
  form.append('docType', docType); // text field first so the server sees it before the file
  form.append('file', file);
  const raw = await mockOrReal(() => mockDocuments.upload(applicationId, docType, file), `/api/applications/${encodeURIComponent(applicationId)}/documents`, { method: 'POST', form });
  return raw.ok ? { ok: true, document: raw.data.document } : { ok: false, code: docError(raw) };
}

/** Returns a short-lived signed URL (60 s). Open it immediately; do not store or share it. */
export async function getDocumentUrl(documentId) {
  const raw = await mockOrReal(() => mockDocuments.url(documentId), `/api/documents/${encodeURIComponent(documentId)}/url`, { method: 'GET' });
  return raw.ok ? { ok: true, url: raw.data.url } : { ok: false, code: docError(raw) };
}

export async function deleteDocument(documentId) {
  const raw = await mockOrReal(() => mockDocuments.remove(documentId), `/api/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' });
  return raw.ok ? { ok: true } : { ok: false, code: docError(raw) };
}


/** Downloads a private, owner-checked application summary PDF. The PDF excludes personal ID details. */
export async function downloadApplicationPdf(applicationId) {
  if (!supabase || authMode === 'mock') return { ok: false, code: 'notConfigured' };
  let token;
  try { token = (await supabase.auth.getSession()).data.session?.access_token; } catch { /* handled below */ }
  if (!token) return { ok: false, code: 'sessionExpired' };
  let response;
  try {
    response = await fetch(`${BASE}/api/applications/${encodeURIComponent(applicationId)}/pdf`, {
      method: 'GET', headers: { Authorization: `Bearer ${token}` }
    });
  } catch { return { ok: false, code: 'network' }; }
  if (!response.ok) {
    if (response.status === 401) return { ok: false, code: 'sessionExpired' };
    if (response.status === 404) return { ok: false, code: 'notFound' };
    if (response.status === 429) return { ok: false, code: 'rateLimited' };
    if (response.status === 503) return { ok: false, code: 'serverUnavailable' };
    return { ok: false, code: 'serverError' };
  }
  try {
    const blob = await response.blob();
    if (blob.type !== 'application/pdf' || blob.size === 0) return { ok: false, code: 'serverError' };
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ariana-application-${String(applicationId).replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true };
  } catch { return { ok: false, code: 'serverError' }; }
}
