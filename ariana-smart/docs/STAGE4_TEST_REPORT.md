# Stage 4 test report (honest scope)

## Starting point
Built on the Stage 3 ZIP (verified identical to the working tree). Existing tables, constraints, reference generation (`application_ref_seq`) and RLS select policies were reused; no table was duplicated.

## Design (security)
- The browser sends the form + an idempotency key to `POST /api/applications` with the user's login token. **It never sends a user id or status.**
- Backend verifies the token with Supabase, takes `user_id` from it, forces `status='submitted'`, validates every field (shared rules file, identical copy in frontend and backend), then inserts with the service-role client. The reference number comes from the existing database default.
- `schema.sql` / `migrations/stage4_applications.sql`: the user INSERT policy was **removed** (stricter than before), so browsers cannot insert directly with the anon key. Users still read only their own rows (`apps_select`). Triggers log status history and `updated_at`.
- Duplicates: `unique(user_id, idempotency_key)` makes retries/double-clicks idempotent; an open application with the same name, route and departure date is refused (409). The UI also blocks double submit.
- The dashboard list never selects `id_document_number`.

## REAL tests that were run (no Supabase involved)
- `node --test`: frontend 10 pass; backend 9 pass. They cover every validation rule, dropping of injected `user_id`/`status`/`reference`, server-set owner and status, idempotent retry, duplicate refusal, per-user isolation, unique-violation race handling and DB-error propagation, and that the shared rule files are identical in both apps.
  - Caveat: the backend service tests use an **in-memory fake** of the Supabase client, not a database.

## MOCK tests that were run (development mock, not Supabase, not the real backend)
- 36 browser checks in headless Chromium: guest redirect, prefill, validation messages and focus, return-date toggle, origin excluded from destination, reference format, confirmation text, dashboard row + status, double-click creates one row, duplicate refusal, second reference, form reset, user isolation, no console errors, no horizontal overflow on /apply and /dashboard at 320/390/768/1440 px in light and dark.
- The mock re-uses the real validation module but its storage/rules are a re-implementation; it proves the UI flow only.

## NOT tested (do not assume these work yet)
1. Saving to a real Supabase database, the real `application_ref_seq` reference, and the new triggers/policies (SQL has never been run).
2. That the browser really cannot insert directly after the migration (RLS behaviour).
3. The real backend: server start, CORS with your frontend origin, rate limiting, `POST /api/applications` over HTTP (express and supabase-js are unavailable offline).
4. `npm install`, `vite build`, and real `react-router-dom` (a stand-in router and a supabase-js stub were used in test bundles).
5. Real Safari/Firefox/mobile devices, screen readers, keyboard-only walkthrough, native date-picker behaviour on iOS/Android.

## Known limitations / next steps
- Application list has no detail/edit/cancel page yet (users cannot edit or cancel; admin tooling is later).
- Admin UPDATE policy lets an admin change any column; to be reviewed in the Stage 8 security review.
- `id_document_number` is stored as plain text protected by RLS/service role; column encryption is not implemented.
- Duplicate check is by exact name+route+date among open statuses; a determined user can alter spelling to submit near-duplicates.
- Stage 5 (documents) and Stage 6 (Sheets sync, `sheet_sync_status` stays `pending`) are not started.
