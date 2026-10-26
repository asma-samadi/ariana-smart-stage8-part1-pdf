# Ariana Smart - Stage 1: Plan & Architecture
Educational demo inspired by Ariana Afghan Airlines. Not official; no real tickets, fares or flights.

## Architecture
React+Vite (Netlify) -> Express API (Render) -> Supabase (Postgres, Auth, private Storage) -> optional Google Sheets / AI provider.
- Browser uses only the Supabase anon key and the user's JWT. The backend verifies the JWT on every protected route.
- Service-role key, AI key and Google credentials exist ONLY in backend environment variables.
- Applications are saved to Supabase first; Sheets sync is async, retryable and idempotent (keyed on reference).
- AI assistant: backend retrieves from /knowledge (fictional and verified data kept separate), sends no passenger data to the provider, and falls back to keyword answers from the knowledge base.

## Stages and status
1 Inspect/plan: DONE (schema, config templates, backend skeleton, this plan)
2 Design system, homepage, About, Travel info: DONE (see docs/STAGE2_TEST_REPORT.md)
3 Auth and dashboard: DONE in code; real Supabase NOT yet tested (see docs/STAGE3_TEST_REPORT.md, docs/SETUP_SUPABASE.md)
4 Application form and persistence: DONE in code; real Supabase/backend NOT yet tested (docs/STAGE4_TEST_REPORT.md)
5 Private uploads: DONE in code; real Supabase Storage NOT yet tested (docs/STAGE5_TEST_REPORT.md)
6 Google Sheets and sample XLSX: DONE (mock-tested; real Google/Supabase not yet verified)
7 en/prs/pus interface (part 1) DONE; RTL polish, localized formatting, light/dark themes (part 2) DONE, tested without the real build (docs/STAGE7_PART2_REPORT.md); AI assistant (part 3) DONE in code; local rule-based, not an external AI model
8 PDF summary export DONE in part 1 (owner-checked API, excludes sensitive passenger fields, dashboard download UI; unit-tested). Admin document review/dashboard UI and full security review remain. See docs/STAGE8_PART1_REPORT.md
9 Final integration and test report: NOT STARTED

## You will need later
Supabase project (URL, anon key, service-role key); optional Google Cloud service account and Sheet; optional AI provider key; Render and Netlify accounts; a GitHub repo.

## Testing status
See docs/STAGE2_TEST_REPORT.md. The sandbox has no network, so `npm install`, `vite build` and the real `react-router-dom` were never run. The SQL has not been run against a real Supabase project.
