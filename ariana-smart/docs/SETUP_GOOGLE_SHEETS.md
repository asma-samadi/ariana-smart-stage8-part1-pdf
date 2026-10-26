# Google Sheets setup (optional, Stage 6)

Supabase stays the primary database. The sheet is a **one-way, minimal copy** for administrators. The app works fully without it.

## What is (and is not) sent
Sent: reference, submitted time, status, origin, destination, trip type, departure/return date, passenger count, nationality, sync time.
**Never sent:** name, date of birth, email, phone, passport/ID number, uploaded documents, document paths or URLs, user ids, tokens, idempotency keys. (The database function that hands rows to the sync code does not even select those columns.)

## Steps
1. Run `supabase/migrations/stage6_sheets.sql` in the Supabase SQL editor (new projects: the updated `schema.sql` already includes it).
2. Google Cloud console: create a project, enable **Google Sheets API**, create a **service account**, create a **JSON key** and download it. Keep it out of the project folder and out of Git.
3. Create an **empty** Google Sheet (tab named `Applications`, or set `GOOGLE_SHEETS_TAB`). Share it (Editor) with the service account's `client_email`. The header row is written automatically; a sheet with a different header is refused.
4. Encode the key as one line: macOS/Linux `base64 -w0 key.json` (macOS: `base64 -i key.json | tr -d '\n'`); Windows PowerShell `[Convert]::ToBase64String([IO.File]::ReadAllBytes("key.json"))`.
5. In `backend/.env` (never committed) or your host's secret settings (e.g. Render) set `GOOGLE_SHEETS_ID` (the id between `/d/` and `/edit`) and `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`. Delete the downloaded key file afterwards or store it in a password manager.
6. `cd backend && npm install && npm run dev`. `GET /api/health` shows `sheetsConfigured: true`.
7. Make yourself admin once (SQL editor): `update public.profiles set role='admin' where id = '<your-auth-user-uuid>';`

## Administrator endpoints (admin role only; users get 403)
All need `Authorization: Bearer <your Supabase access token>`.
- `GET  /api/admin/sheets/status` - configuration status (no secrets) and counts by sync state.
- `POST /api/admin/sheets/sync` - retry all pending/failed/disabled (max 50 per call; stops early on configuration errors).
- `POST /api/admin/sheets/sync/:applicationId` - retry one.

## How duplicates are prevented
1. New applications sync once, after they are saved. Idempotent replays and duplicate submissions never trigger a sync.
2. The database function `claim_sheet_sync` atomically moves a row to `syncing` for exactly one worker (stale claims older than 5 minutes can be retaken).
3. Before appending, the sheet's column A is checked for the reference, which covers a crash between "appended" and "marked synced".
Transient errors (429, 5xx, network) are retried with backoff (3 attempts); permanent errors (401/403/404/400, wrong header) are not. Only a short error code is stored, never Google's raw message.

## If it fails
`sheet_sync_error` shows a code: `permission_denied` (sheet not shared with the service account, or API disabled), `sheet_not_found` (wrong id), `auth_failed` (bad key), `header_mismatch` (sheet has other headers), `rate_limited`, `google_server_error`, `network_error`.

## Rotate/revoke
If a key leaks: delete the key in Google Cloud, create a new one, update the secret, redeploy. Run `npm run scan:secrets` before every push.
