# Supabase setup (beginner guide) - needed for real login

You never need to share any key with anyone. Keys go only into your own `.env` files.

## 1. Create the project
1. Sign up at https://supabase.com and click **New project**. Pick a name, a strong database password (save it in a password manager) and a nearby region.
2. Wait until the project finishes provisioning.

## 2. Create the database tables
1. Left menu -> **SQL Editor** -> **New query**.
2. Paste the whole contents of `supabase/schema.sql` and click **Run**. (If you see "already exists" errors you ran it twice; that is fine for the first successful run.)
3. Check **Table Editor**: `profiles`, `applications`, `application_documents`, `application_status_history` should exist.

> **Already ran the Stage 1-3 `schema.sql`?** Do not re-run it. Instead run `supabase/migrations/stage4_applications.sql` once (it is safe to repeat). It removes the browser's permission to insert applications directly and adds the history/updated-at triggers. New projects just run the updated `schema.sql`.

## 3. Copy the keys (Project Settings -> API)
| Value | Goes into | Public? |
|---|---|---|
| Project URL | `frontend/.env` `VITE_SUPABASE_URL` and `backend/.env` `SUPABASE_URL` | yes |
| `anon` / publishable key | `frontend/.env` `VITE_SUPABASE_ANON_KEY` | yes (safe in browser) |
| `service_role` / secret key | `backend/.env` `SUPABASE_SERVICE_ROLE_KEY` ONLY | **NO - never in frontend, never in Git** |

The app refuses to run if it finds a service-role key in the frontend configuration.

## 4. Allowed redirect URLs (needed for password reset and email links)
Authentication -> **URL Configuration**:
- Site URL: `http://localhost:5173` while developing (change to your Netlify URL when you deploy).
- Redirect URLs: add `http://localhost:5173/**` and later `https://YOUR-SITE.netlify.app/**`.

## 5. Email confirmation
Authentication -> Providers -> Email. With "Confirm email" ON (default), new users must click the emailed link before logging in. Supabase's built-in email sender is heavily rate limited (a few emails per hour); for real use, configure custom SMTP. For quick local testing you may turn confirmation off - turn it back on for any real deployment.

## 6. Run and test
```
cd frontend
cp .env.example .env      # then fill in the two VITE_ values; leave VITE_AUTH_MOCK=false
npm install
npm run dev
```
Manual test checklist: register -> confirm email -> log in -> dashboard shows your name -> edit profile -> log out -> `/dashboard` redirects to login -> "Forgot password" email arrives -> link opens `/reset-password` -> set new password.

Optional backend check: fill `backend/.env`, `cd backend && npm install && npm run dev`, then call `GET /api/me` with header `Authorization: Bearer <access token>`; it should return your id, email and role.

## 7. Run the backend (required for ticket applications from Stage 4)
Applications are saved by the backend, which checks your login token. Without it the form shows "could not reach the server".
```
cd backend
cp .env.example .env     # fill SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (secret!), keep ALLOWED_ORIGINS=http://localhost:5173
npm install
npm run dev              # http://localhost:4000/api/health should say supabaseConfigured: true
```
Keep `frontend/.env` -> `VITE_API_BASE_URL=http://localhost:4000`. When deployed, set the backend's `ALLOWED_ORIGINS` to your Netlify URL and the frontend's `VITE_API_BASE_URL` to your Render URL.

### Stage 4 manual test checklist (real project)
1. Log in -> **Ticket Application** -> submit with empty fields: errors appear, nothing is saved.
2. Fill a valid application, tick consent, submit: a reference like `ASM-2026-001000` appears.
3. Dashboard shows the application with status *Submitted* (Supabase -> Table Editor -> `applications` shows one row; `application_status_history` shows one row).
4. Double-click Submit / refresh and resubmit: still one row.
5. Submit the same person, route and date again: refused as duplicate.
6. Register a second account: its dashboard must NOT show the first account's applications.
7. Try in the browser console with the anon key: `supabase.from('applications').insert({...})` must be rejected (no insert policy).

## 7b. Stage 5: private document uploads
- Existing project: run `supabase/migrations/stage5_documents.sql` once in the SQL Editor (safe to repeat). New project: the updated `schema.sql` already contains it.
- It reuses the existing `application_documents` table (no new table), adds type/size/mime CHECKs, an owner-consistency trigger, and makes the `application-documents` bucket private with a 10 MB / PDF-JPEG-PNG limit. There are deliberately **no** `storage.objects` policies: browsers cannot read or write Storage directly.
- `backend/.env`: `SUPABASE_STORAGE_BUCKET=application-documents`, `MAX_UPLOAD_MB=5` (the backend never allows more than 10).
- Endpoints (all need `Authorization: Bearer <token>`): `GET/POST /api/applications/:id/documents`, `GET /api/documents/:id/url` (signed link valid 60 s), `DELETE /api/documents/:id`.

### Stage 5 manual test checklist (real project - NOT yet performed)
1. Submit an application, click **Upload documents**, choose *Passport* + a small PDF: it appears in the list; Supabase -> Storage -> `application-documents` shows `<your-user-id>/<application-id>/<random>.pdf`; Table Editor -> `application_documents` shows one row.
2. Click **View**: the file opens; copy the link and wait > 60 s: it must stop working.
3. Rename a text/HTML file to `x.pdf` and upload: refused ("Only real PDF, JPG or PNG files").
4. Upload a file larger than 5 MB: refused. Upload an empty file: refused.
5. Log in as a second user and call `GET /api/applications/<first user's application id>/documents` with that token: `404`. Same for `GET /api/documents/<first user's document id>/url` and `DELETE`: `404`.
6. Without a token, every document endpoint returns `401`.
7. Open a stored object's plain URL (`.../storage/v1/object/public/application-documents/...`): must fail (bucket is private).
8. In the browser console with the anon key: `supabase.storage.from('application-documents').list()` / `.upload(...)` must be denied, and `supabase.from('application_documents').insert({...})` must be rejected.
9. Remove a document: file and row disappear. Set an application's status to `approved_demo` in the table editor: upload/remove are then refused (409).

## 8. Make yourself admin (later stages)
After registering, in SQL Editor: `update public.profiles set role='admin' where id = '<your user id from Authentication -> Users>';`

## Development mock (optional)
Without Supabase you can click through the UI: set `VITE_AUTH_MOCK=true` in `frontend/.env` and run `npm run dev`. A warning banner is shown on every auth page. It stores accounts in your browser, is NOT secure, is NOT Supabase, and is ignored by production builds.
