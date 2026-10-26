# Stage 3 test report (honest scope)

## What was found at the start
The uploaded ZIP contained Stage 1 + Stage 2 only. No Stage 3 files from the earlier session were present, so Stage 3 was written fresh on top of Stage 2 (existing pages, design system, schema and backend skeleton were kept).

## Built
Supabase client wrapper with key-safety checks; validation; error mapping to safe messages; AuthProvider; Register, Login, Logout, Forgot/Reset password; protected and guest-only routes with return-to-page; Dashboard (profile + own applications list, empty state); Profile (name, password); auth-aware navbar; backend `requireAuth` JWT middleware and `GET /api/me`; `_redirects`/`netlify.toml` for SPA routing; `docs/SETUP_SUPABASE.md`.

## Passed (actually run)
- `node --test`: frontend 5 tests (validation, key safety, error mapping), backend 1 test (service-key detection). All pass.
- Browser tests (esbuild bundle in headless Chromium, **development mock auth**): 46 checks - guest redirect, validation messages, register, duplicate email, wrong/right login, redirect-back, session survives reload, guest route redirect, profile save/persist, password change, same-password error, logout, forgot password neutral message, no console errors; no horizontal overflow on login/register/forgot at 320/390/768/1440 px in light and dark.
- Not-configured and "service-role key in frontend" modes: notices shown, forms disabled, dashboard inaccessible.
- A bug found and fixed: "same password" error was mis-mapped to "weak password".

## NOT tested (do not assume these work yet)
- **Real Supabase authentication** (sign-up, email confirmation, login, recovery link, RLS on profiles/applications, the `handle_new_user` trigger). Only the mock was run. `supabase/schema.sql` has never been run against a real project.
- `npm install`, `vite build`, real `react-router-dom` (sandbox had no network; a stand-in router and a stub for `@supabase/supabase-js` were used in test bundles only).
- Backend server start and `/api/me` (express and supabase-js unavailable offline).
- Real Safari/Firefox/mobile devices, screen readers.

## Known limitations
Mock code is still bundled in production builds but is inert (`import.meta.env.DEV` is false). Language is stored only after Stage 7. Route guards are a UX convenience; real protection is RLS and backend JWT checks.
