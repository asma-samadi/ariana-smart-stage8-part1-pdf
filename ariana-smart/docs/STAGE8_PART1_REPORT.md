# Stage 8, Part 1 — Application PDF summary

## Implemented
- Added `GET /api/applications/:id/pdf`, protected by the existing Supabase JWT verification and a per-minute rate limit.
- The backend query filters by both the application ID and the verified `req.user.id`. An application owned by another user returns the same 404 as a missing application.
- The PDF contains only reference, status, origin, destination, trip type, departure/return dates, passenger count and submission date. It does not select or print full name, date of birth, nationality, email, phone, ID/passport number, uploaded documents or user ID.
- Response uses `application/pdf`, attachment disposition and `Cache-Control: private, no-store`. PDF is generated in memory; no temporary file or database schema change is needed.
- Added a dashboard Download PDF button and translated labels/errors for English, Dari and Pashto. Demo/mock mode explains that the feature needs the configured backend.
- Reuses the existing `pdfkit` dependency declared by the backend.

## Automated checks
- Frontend tests: 89 passed, 0 failed.
- Backend tests: 74 passed, 0 failed, including ownership and safe-field selection for the PDF summary query.
- JavaScript syntax checks passed for the backend route/service and frontend API module.
- The frontend build could not be repeated in this sandbox because Vite was not installed; an attempted dependency install timed out. The user previously confirmed that `npm run build` worked before this Stage 8 change, so please run it again after installing dependencies.
- No live Supabase, browser download, or Google Sheets integration was tested here.

## Next Stage 8 items
1. Install dependencies locally and run `npm run build` in `frontend/`.
2. Verify PDF download with a test application and two accounts (owner succeeds; another account gets 404).
3. Add the planned admin document-review/dashboard UI with admin-only backend authorization.
4. Continue the security review and then prepare the Stage 9 integration report.
