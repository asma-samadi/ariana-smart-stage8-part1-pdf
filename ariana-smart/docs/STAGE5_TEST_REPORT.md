# Stage 5 test report: Private document uploads (honest scope)

## Starting point
Built on `ariana-smart-stage4.zip` (Stages 1-4). The existing `application_documents` table, `docs_select` RLS policy, the private `application-documents` bucket, `requireAuth`, the service-role client, the `.env.example` upload settings and the shared-rules/sync-test pattern were reused. **No table was duplicated.** Stage 1-4 files were extended, not replaced.

## What was added
- `backend/src/lib/documentRules.js` (identical copy in `frontend/src/lib/`): allowed types, limits, magic-byte detection (`sniffMime`), UUID check.
- `backend/src/lib/documentService.js`: list / upload / signed-URL / delete logic.
- `backend/src/routes/documents.js` (mounted in `server.js`): multer memory storage, 1 file, size cap while streaming, per-route rate limits, `requireAuth` on every route.
- `supabase/migrations/stage5_documents.sql` (also merged into `schema.sql`): CHECK constraints, owner-consistency trigger, bucket private + limits, no write policies.
- Frontend: `/applications/:id/documents` page, dashboard "Documents" link, link on the submission confirmation, API client (multipart), development mock, English strings, styles.

## Security design
- Browser sends file + document type + the token. **Never a user id, path or status.** The server derives the owner from the verified token.
- Ownership: every operation first loads the application/document **filtered by the token's user id**; someone else's or nonexistent ids return the same `404` (no probing). Malformed ids are rejected before the database.
- Content: type is decided from the file's **real leading bytes** (PDF / JPEG / PNG only); the filename and browser-supplied MIME are ignored. Size is capped by multer while streaming (default 5 MB, hard cap 10 MB), empty files refused, max 10 documents per application.
- Storage: private bucket; object key is **server-generated** (`<user>/<application>/<random-uuid>.<ext>`); user filenames are never stored or used. If the metadata insert fails, the uploaded object is deleted (no orphans).
- Access: only via a **60-second signed URL** issued to the owner. The internal `storage_path` is never returned to the browser.
- Uploads/deletes are refused once an application is approved/rejected/cancelled (409). The browser cannot write to Storage or to `application_documents` (no policies).
- Existing Stage 4 policies were not weakened.

## REAL tests that were run (no Supabase involved)
- `backend: node --test` -> **24 pass / 0 fail** (15 new). Frontend `node --test` -> **14 pass / 0 fail** (4 new).
- New coverage: magic-byte detection incl. HTML/EXE disguised as `.pdf`; owner upload and server-generated path; upload to another user's application -> 404 and nothing stored; nonexistent / SQL-looking / path-traversal ids -> 404; empty, oversized, hard-cap and bad type rejection; closed-application refusal; 10-document cap; DB failure removes the stored object; list/URL/delete isolation between users; `storage_path` never returned; shared rule files identical in both apps; every UI error string exists.
- Caveat: service tests use an **in-memory fake** of the Supabase client and Storage (the fake honours selected columns), not a real database or bucket.

## NOT tested (do not assume these work)
1. **Real uploads to Supabase Storage**, real signed URLs and their expiry, the real bucket settings, and that RLS/storage really deny browser access. The SQL has never been run.
2. **The real HTTP layer**: express, multer, helmet, CORS (DELETE/multipart from your origin) and rate limiting were not run, because `npm install` has no network access in this environment. Multer's size/part limits and error mapping are therefore unverified.
3. **The React UI was not built or rendered** (no vite/react/react-router available offline). The Documents page, dashboard column and mock were written but not executed; only the pure-JS rules and i18n keys are unit-tested. Stage 4's browser checks were not re-run.
4. Real browsers/devices, screen readers, camera-uploaded photos (large JPEGs), and `window.open` pop-up blocking for the View button.
5. Malware scanning: not implemented. Magic bytes confirm the file *starts* like a PDF/JPEG/PNG; they do not prove it is harmless.

## Known limitations / next steps
- The `file-type` dependency from Stage 1 is unused (detection is built-in for three formats).
- No virus scan, no image re-encoding, no document replacement (remove then upload), no admin viewing (Stage 8).
- Signed URLs are bearer links for 60 s; anyone who gets one in that window can open the file.
- Deleting an application cascades its metadata rows, but Storage objects are not auto-removed (cleanup job is future work).
- Rate limits are per-IP in memory (single instance).
