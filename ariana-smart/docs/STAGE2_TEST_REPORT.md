# Stage 2 test report (honest scope)

## Environment limits
The sandbox has no internet, so `npm install` and `vite build` could NOT be run, and the real `react-router-dom` package was unavailable.
Testing method: the real project source was bundled with esbuild (React 19.2.5, not the React 18 in package.json) and loaded in headless Chromium via Playwright. `react-router-dom` was replaced by a small test-only stand-in implementing the few APIs the app uses (BrowserRouter, Routes, Route, Link, NavLink, useLocation). The test scripts live outside the project and are not included.

## Passed (actually run)
- Bundle compiles with no errors (esbuild).
- 30 page loads (5 routes x 3 viewports 1440/768/390 x light/dark): no console errors or warnings, no missing translation keys, no horizontal overflow, correct theme attribute.
- Header sweep at 81 widths (320-1920px): no overlapping elements, no horizontal overflow (home page).
- Interactions (25 checks): route filter, empty state and reset; FAQ expand/collapse (single open); theme toggle, persistence across reload; placeholder navigation; aria-current on active link; Travel page tables (6 routes, 7 statuses); skip link is first Tab stop; mobile menu open/Escape/auto-close on navigate; `/#faq` anchor scrolling (including from the footer link); forcing `dir="rtl"` causes no overflow on mobile.
- Colour contrast (computed from tokens): all text/background pairs >= 4.5:1 in both themes.
- Visual inspection of screenshots: desktop, tablet, mobile, light, dark, open mobile menu.
- Bugs found and fixed during testing: header content overlapping theme toggle on desktop; 13px horizontal overflow at 320px (nowrap badge).

## NOT tested
- `npm install`, `npm run dev`, `vite build` with the real dependency versions (React 18, Vite 5, react-router-dom 6).
- Behaviour of the real react-router-dom (only a stand-in was tested).
- Real Safari/Firefox/mobile devices (Chromium only); screen readers; keyboard walkthrough beyond the skip link.
- RTL appearance with real Dari/Pashto text and fonts (only a `dir` flip was checked; no translations exist yet).
- Backend and SQL (unchanged from Stage 1; never run against real services).

## Known limitations
- Persian fonts are not bundled yet. Hero art is a vector illustration, not photography. Placeholder pages (/apply, /assistant, /contact, /login, /register) are intentionally inactive.
