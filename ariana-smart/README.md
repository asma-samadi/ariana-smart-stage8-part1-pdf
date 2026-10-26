# Ariana Smart (educational demo)
Not affiliated with Ariana Afghan Airlines. All routes, fares and passengers are fictional.
No tickets are issued and no real flight information is shown.

**Status: Stage 8 (part 1) of 9** — Stage 7 includes English, Dari and Pashto, RTL/LTR layout, localized numbers/dates, light/dark theme, and a local rule-based assistant. Stage 8 part 1 adds an owner-checked PDF application summary download. Remaining Stage 8 work includes admin document review/dashboard UI and a broader security review. See `docs/PLAN.md` and `docs/STAGE8_PART1_REPORT.md`.

| Works now | Not built yet (navigation placeholders only) |
|---|---|
| Register, login, logout, password reset, protected dashboard and profile (tested with a dev mock only) |
| Ticket application form: validation, backend-saved, unique reference, shown on dashboard (tested with mock + unit tests only) |
| Private document upload per application (PDF/JPG/PNG, backend-validated, signed-URL viewing; unit-tested with fakes only, NOT yet tested against real Supabase Storage) |
| Home, About, Travel Information pages | Real Supabase login verified (needs your project; see docs/SETUP_SUPABASE.md) |
| Responsive navigation, footer, FAQ | Real database persistence verified (needs your Supabase + backend; see docs/SETUP_SUPABASE.md) |
| Light/dark theme: saved choice, follows the OS until you choose, no wrong-theme flash, AA contrast (tested) | Admin review of documents and admin dashboard UI (remaining Stage 8) |
| Sample route explorer (fictional data) | Real Supabase / Google Sheets integration tests (require your configured services) |
| Right-to-left polish: mirrored arrows, Latin e-mails/codes isolated, adaptive header, themed dialog; Persian digits and Gregorian dates in Dari/Pashto (display only) | Real-browser / live-service checks (not run in this sandbox; see stage reports) |
| English, Dari (`prs`) and Pashto (`pus`) interface; language selector in the header; choice saved across reloads; `<html lang dir>` updated (translations NOT yet reviewed by native speakers) | Admin dashboard UI (Stage 8) |
| Google Sheets sync of a minimal, non-sensitive row per application; admin-only endpoints; duplicate-safe retries (unit-tested with mocks only, NOT tested against real Google Sheets or real Supabase) | Real Google Sheets sync verified (needs your service account; see docs/SETUP_GOOGLE_SHEETS.md) |
| Fictional sample workbook `samples/ariana-smart-sample-data.xlsx` | |

## Folder map
```
frontend/   React + Vite app (plain CSS design tokens, no Tailwind needed)
  src/styles/       tokens.css (all colours, light + dark), base, components, layout, pages
  src/components/ui/      Button, Card, Badge, StatusBadge, Accordion, Icon, Logo, RouteCard, ...
  src/components/layout/  Navbar, Footer, Layout
  src/pages/        Home, About, Travel, ComingSoon (placeholder), NotFound
  src/i18n/         en.js / prs.js / pus.js dictionaries, core.js (pure logic, tested), index.jsx (React provider)
  src/data/         fictional sample routes
  src/theme/        core.js (pure, tested) + ThemeProvider
  src/lib/format.js localized numbers, dates, durations, file sizes (display only)
backend/    Express API skeleton (Stage 1)
supabase/   schema.sql with RLS (Stage 1)
samples/    ariana-smart-sample-data.xlsx (fictional) + generator script
docs/       PLAN.md, DESIGN_SYSTEM.md, SETUP_SUPABASE.md, SETUP_GOOGLE_SHEETS.md, STAGE2-6_TEST_REPORT.md,
            STAGE7_PART1_REPORT.md, STAGE7_PART2_REPORT.md, TRANSLATION_REVIEW.md (Dari/Pashto text needing native-speaker review)
```

## Run the frontend locally
1. Install Node.js 18+ and open the `ariana-smart` folder in VS Code.
2. `cd frontend && npm install && npm run dev`
3. Open http://localhost:5173
Without a `.env`, auth pages show a "Supabase is not configured" notice. To click through accounts without Supabase, set `VITE_AUTH_MOCK=true` (dev only, clearly labelled, not secure). For real login follow `docs/SETUP_SUPABASE.md`.
Ticket applications also need the backend running (`docs/SETUP_SUPABASE.md` step 7). If you already ran the old schema, run `supabase/migrations/stage4_applications.sql`, then `supabase/migrations/stage5_documents.sql` (documents), then `supabase/migrations/stage6_sheets.sql` (Sheets sync).
Run `cd frontend && npm install && npm run build` after extracting the project. The current sandbox did not have Vite installed, so the build could not be repeated here.
Tests: `npm test` in `frontend/` (89 tests) and `backend/` (74 tests). Secrets scan: `npm run scan:secrets` in `backend/` (also runs inside the backend tests).

## Run the backend skeleton (Stage 1, untested with real services)
1. `cd backend && cp .env.example .env` (never commit `.env`)
2. `npm install && npm run dev` then open http://localhost:4000/api/health

## Database
Paste `supabase/schema.sql` into the Supabase SQL Editor and run it (not yet run against a real project).

`VITE_` variables are public in the browser. Never put secrets there.
