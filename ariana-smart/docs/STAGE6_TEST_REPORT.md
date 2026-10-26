# Stage 6 test report: Google Sheets sync + fictional workbook (honest scope)

## Starting point
The uploaded file was `ariana-smart-stage5.zip` only. **No partially completed Stage 6 files were present**, so nothing from the earlier (interrupted) session could be recovered or reused. The earlier "33 tests passed" figure could not be verified. Stage 6 was implemented from the Stage 5 files, extending (not replacing) them. The existing Stage 4/5 tests were left unchanged and still pass.

## What was added
- `backend/src/lib/sheetsConfig.js` env parsing (credentials only in memory), `sheetsRow.js` allow-list row mapping + formula guard, `sheetsErrors.js` error classification (codes only), `sheetsClient.js` Sheets wrapper (header check, reference lookup, RAW append) + lazy real `googleapis` factory, `sheetsSync.js` claim/retry/sync service, `sheetsRuntime.js` runtime wiring, `adminHandlers.js`, `rateLimits.js`.
- `middleware/requireAdmin.js` (role read from `profiles` for the verified user, fails closed); `routes/admin.js` mounted at `/api/admin` with rate limit + `requireAuth` + `requireAdmin` before every route. `requireAuth` was refactored into a factory (behaviour unchanged).
- `applicationService.createApplication` takes an optional `onCreated` hook, called only for a brand-new row.
- `supabase/migrations/stage6_sheets.sql` (also merged into `schema.sql`): bookkeeping columns, `syncing` state, atomic `claim_sheet_sync` function (service role only).
- `backend/scripts/secretsScan.js` (`npm run scan:secrets`), `samples/ariana-smart-sample-data.xlsx` (+ generator), `docs/SETUP_GOOGLE_SHEETS.md`, `.env.example` entries.

## Tests actually run (this sandbox, `node --test`)
- Backend: **73 tests, 73 pass, 0 fail, 0 skipped** (24 from Stages 1-5, 49 new).
- Frontend: **14 tests, 14 pass, 0 fail** (unchanged).
- Secrets scan on the whole project tree: passed (also asserted inside the backend tests). `node --check` syntax check of every backend source file: passed.
- Workbook: opened with openpyxl and LibreOffice; headers equal the code's `SHEET_HEADERS`; the Summary formulas calculate (3/2/1/2/1/1 = 10); no @, links or ID-like values.

New test files: `sheetsSync` (16: success, no sensitive data in the row, formula guard, duplicate/concurrent/crash-recovery/stale-claim, retries + backoff, permanent errors, no raw error text stored or logged, disabled mode, batch), `sheetsClient` (7: Sheets API calls, header mismatch, RAW writes, classification), `sheetsConfig` (4), `authorization` (9), `applicationSync` (5), `secretsScan` (5), `rateLimit` (2).

## IMPORTANT: what these tests are
**All Sheets and database tests use in-memory fakes/mocks** (`test/helpers/fakes.js`, a fake of the `googleapis` shape, a fake Supabase client). Authorization tests run the middleware chain with fake request/response objects; the route file itself is checked only by a **static source check**.

## NOT tested - do not assume these work
1. **No real Google Sheets sync was run.** No service account, sheet, or Google API call was used. Real auth, quotas, sharing errors and the `googleapis` calls are unverified.
2. **No real Supabase was used.** `stage6_sheets.sql` and the `claim_sheet_sync` function have never been run; the JS fake only imitates their intended behaviour. Real RLS/grants (browser cannot call the function) are unverified.
3. **Express, helmet, CORS, and rate limiting were not executed** (`npm install` has no network here). The rate-limit tests check the configured values and that they are wired in (static). There is no behavioural 429 test. Manual check once running: `for i in $(seq 1 8); do curl -s -o /dev/null -w "%{http_code} " -X POST localhost:4000/api/admin/sheets/sync; done` should print 401s only (not authenticated) - to see 429 use an admin token; the 6th call within a minute should return 429.
4. The React UI was not built or rendered (unchanged from Stage 5; no frontend changes in Stage 6). There is no admin UI yet (Stage 8).
5. The secrets scan is a pattern scanner; it cannot find every possible secret. Git history is not scanned (no repository was provided).

## Privacy checks (by tests)
The row sent to Sheets contains only the allow-listed columns; tests assert name, email, phone, DOB, ID number and user id do not appear. Errors store/log a fixed code only. Credentials never appear in the health/status responses.

## Known limitations
Sync is one-way and not updated when an application's status later changes (a future stage can add updates). Per-IP in-memory rate limits (single instance). Sync runs in the web process after saving (no queue); if the process dies, the row stays `pending`/`syncing` and an admin retry recovers it.
