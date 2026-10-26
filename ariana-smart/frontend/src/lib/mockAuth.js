/**
 * ============================  MOCK AUTH - DEVELOPMENT ONLY  ============================
 * A localStorage stand-in that mimics the small part of the Supabase JS API this app uses.
 * It exists so the UI can be developed and tested without a Supabase project.
 *  - It is NOT secure (passwords are stored in the browser) and is NOT real Supabase.
 *  - It is only enabled when `npm run dev` AND VITE_AUTH_MOCK=true. Production builds never use it.
 * Real authentication has NOT been tested until you connect your own Supabase project.
 * ========================================================================================
 */
const KEY = 'ariana-mock-auth-v1';
const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || { users: [], session: null, profiles: {}, applications: [] }; }
  catch { return { users: [], session: null, profiles: {}, applications: [] }; }
};
const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));
const err = (code, message, status = 400) => ({ code, message, status, name: 'AuthApiError' });
const uid = () => 'mock-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/**
 * MOCK of POST /api/applications (development only). Re-uses the SAME validation module as the real
 * backend and applies the same rules (user from session, status forced, idempotency, duplicate check),
 * but it is NOT the real backend and proves nothing about Supabase persistence.
 */
export async function mockSubmitApplication(input) {
  const { validateApplication, todayISO } = await import('./applicationRules.js');
  const db = load();
  if (!db.session) return { status: 401, body: { error: 'unauthenticated' } };
  const { errors, value } = validateApplication(input);
  if (Object.keys(errors).length) return { status: 400, body: { error: 'validation_failed', fields: errors } };
  const mine = db.applications.filter((a) => a.user_id === db.session);
  const same = mine.find((a) => a.idempotency_key === value.idempotencyKey);
  if (same) return { status: 200, body: { application: { id: same.id, reference: same.reference, status: same.status, created_at: same.created_at }, duplicate: true } };
  const dup = mine.find((a) => a.full_name === value.fullName && a.origin === value.origin && a.destination === value.destination && a.depart_date === value.departDate && ['submitted', 'under_review', 'documents_required'].includes(a.status));
  if (dup) return { status: 409, body: { error: 'duplicate_application', reference: dup.reference } };
  const seq = 1000 + db.applications.length;
  const row = {
    id: uid(), reference: `ASM-${todayISO().slice(0, 4)}-${String(seq).padStart(6, '0')}`, user_id: db.session, status: 'submitted',
    full_name: value.fullName, origin: value.origin, destination: value.destination, trip_type: value.tripType,
    depart_date: value.departDate, return_date: value.returnDate, passengers: value.passengers,
    id_document_number: value.idDocumentNumber, idempotency_key: value.idempotencyKey, created_at: new Date().toISOString()
  };
  db.applications.push(row); save(db);
  return { status: 201, body: { application: { id: row.id, reference: row.reference, status: row.status, created_at: row.created_at }, duplicate: false } };
}

/**
 * MOCK of the document endpoints (development only). Mirrors the real rules (owner only, content sniffing,
 * size/type/count limits, closed-application refusal) but stores METADATA ONLY in localStorage: no real file is
 * stored and no real signed URL exists. It proves the UI flow, NOT Supabase Storage.
 */
export const mockDocuments = {
  async _ctx() {
    const rules = await import('./documentRules.js');
    const db = load();
    return { rules, db, uid: db.session };
  },
  async list(appId) {
    const { db, uid } = await this._ctx();
    if (!uid) return { ok: false, status: 401 };
    const app = db.applications.find((a) => a.id === appId && a.user_id === uid);
    if (!app) return { ok: false, status: 404 };
    const docs = (db.documents || []).filter((d) => d.application_id === appId && d.user_id === uid).map(({ user_id, ...pub }) => pub);
    return { ok: true, status: 200, data: { documents: docs } };
  },
  async upload(appId, docType, file) {
    const { rules, db, uid } = await this._ctx();
    if (!uid) return { ok: false, status: 401 };
    const app = db.applications.find((a) => a.id === appId && a.user_id === uid);
    if (!app) return { ok: false, status: 404 };
    if (!rules.UPLOADABLE_STATUSES.includes(app.status)) return { ok: false, status: 409, data: { error: 'application_closed' } };
    if (!rules.DOC_TYPES.includes(docType)) return { ok: false, status: 400, data: { code: 'docTypeInvalid' } };
    if (!file || file.size === 0) return { ok: false, status: 400, data: { code: 'fileEmpty' } };
    if (file.size > rules.MAX_FILE_BYTES) return { ok: false, status: 413 };
    const mime = rules.sniffMime(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
    if (!mime) return { ok: false, status: 415 };
    db.documents = db.documents || [];
    if (db.documents.filter((d) => d.application_id === appId && d.user_id === uid).length >= rules.MAX_DOCS_PER_APPLICATION) return { ok: false, status: 409, data: { error: 'too_many_documents' } };
    const doc = { id: uid_(), application_id: appId, user_id: uid, doc_type: docType, mime_type: mime, size_bytes: file.size, created_at: new Date().toISOString() };
    db.documents.push(doc); save(db);
    const { user_id, ...pub } = doc;
    return { ok: true, status: 201, data: { document: pub } };
  },
  async url(docId) {
    const { db, uid } = await this._ctx();
    if (!uid) return { ok: false, status: 401 };
    const d = (db.documents || []).find((x) => x.id === docId && x.user_id === uid);
    return d ? { ok: true, status: 200, data: { url: 'about:blank#mock-no-real-file' } } : { ok: false, status: 404 };
  },
  async remove(docId) {
    const { rules, db, uid } = await this._ctx();
    if (!uid) return { ok: false, status: 401 };
    const d = (db.documents || []).find((x) => x.id === docId && x.user_id === uid);
    if (!d) return { ok: false, status: 404 };
    const app = db.applications.find((a) => a.id === d.application_id && a.user_id === uid);
    if (!app || !rules.UPLOADABLE_STATUSES.includes(app.status)) return { ok: false, status: 409, data: { error: 'application_closed' } };
    db.documents = db.documents.filter((x) => x.id !== docId); save(db);
    return { ok: true, status: 200, data: { deleted: true } };
  }
};
const uid_ = uid;

export function createMockClient() {
  const listeners = new Set();
  const emit = (event, session) => listeners.forEach((fn) => fn(event, session));
  const publicUser = (u) => u && { id: u.id, email: u.email, user_metadata: u.meta, created_at: u.created_at };
  const mkSession = (u) => ({ access_token: 'mock-token', user: publicUser(u) });

  const auth = {
    async getSession() {
      const db = load();
      const u = db.users.find((x) => x.id === db.session);
      return { data: { session: u ? mkSession(u) : null }, error: null };
    },
    onAuthStateChange(cb) {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    },
    async signUp({ email, password, options }) {
      const db = load();
      if (db.users.some((u) => u.email === email)) return { data: null, error: err('user_already_exists', 'User already registered', 422) };
      const user = { id: uid(), email, password, meta: options?.data || {}, created_at: new Date().toISOString() };
      db.users.push(user);
      db.profiles[user.id] = { id: user.id, full_name: user.meta.full_name || null, role: 'user', language: 'en', theme: 'light' };
      save(db); // mock: no email confirmation step
      return { data: { user: publicUser(user), session: null }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const db = load();
      const u = db.users.find((x) => x.email === email && x.password === password);
      if (!u) return { data: null, error: err('invalid_credentials', 'Invalid login credentials') };
      db.session = u.id; save(db);
      const session = mkSession(u);
      emit('SIGNED_IN', session);
      return { data: { session, user: session.user }, error: null };
    },
    async signOut() {
      const db = load(); db.session = null; save(db);
      emit('SIGNED_OUT', null);
      return { error: null };
    },
    async resetPasswordForEmail() {
      // Real Supabase answers the same way whether or not the account exists.
      return { data: {}, error: null };
    },
    async updateUser({ password }) {
      const db = load();
      const u = db.users.find((x) => x.id === db.session);
      if (!u) return { data: null, error: err('session_missing', 'Auth session missing', 401) };
      if (u.password === password) return { data: null, error: err('same_password', 'New password should be different from the old password', 422) };
      u.password = password; save(db);
      return { data: { user: publicUser(u) }, error: null };
    }
  };

  const table = (name) => {
    const q = { _f: null };
    const api = {
      select() { return api; },
      eq(col, val) { q._f = [col, val]; return api; },
      order() { return api; },
      async maybeSingle() {
        const db = load();
        if (name !== 'profiles') return { data: null, error: null };
        return { data: db.profiles[q._f?.[1]] || null, error: null };
      },
      update(patch) {
        return { eq: (_c, id) => ({ select: () => ({ async maybeSingle() {
          const db = load();
          if (!db.profiles[id]) return { data: null, error: null };
          const { role, id: _i, ...safe } = patch; // role can never be self-changed
          db.profiles[id] = { ...db.profiles[id], ...safe }; save(db);
          return { data: db.profiles[id], error: null };
        } }) }) };
      },
      then(resolve) {
        // applications list: only the signed-in mock user's own rows (mirrors RLS)
        const db = load();
        const rows = name === 'applications' ? (db.applications || []).filter((a) => a.user_id === db.session).map(({ id_document_number, ...pub }) => pub).reverse() : [];
        resolve({ data: rows, error: null });
      }
    };
    return api;
  };

  return { auth, from: table, __mock: true };
}
