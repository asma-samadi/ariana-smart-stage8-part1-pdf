# Stage 7, Part 2 report: RTL/LTR polish, localization, light/dark themes

Scope: layout direction, localized display formatting, and the theme system. **Not done (by instruction): the AI assistant (Part 3).**
Backend, database schema, authentication, private uploads, Supabase integration and Google Sheets code were **not modified**
(verified: `backend/`, `supabase/` and `samples/` are byte-identical to `ariana-smart-stage7-part1.zip`).

## Final status (after Phase A verification and Phase B packaging)

**The real production build has NOT been run, and nothing in this project claims it passed.** `npm install` could not reach the
npm registry from the environment where this work was done (no network, empty cache: `ENOTCACHED`), so `node_modules` was never
installed and `vite build` / `npm run dev` never ran with the project's real dependencies (React 18, react-router-dom 6, Vite 5).
**First thing to do on a machine with npm registry access:**

```
cd frontend && npm install && npm run build
```

Checks that actually ran in the final workspace (Phase A):

| Check | Result |
|---|---|
| Backend tests | 73 / 73 pass |
| Frontend tests | 85 / 85 pass |
| Secrets scan | passed |
| `node --check` on every backend/frontend `.js` file | 0 failures |
| esbuild compile of all `frontend/src` | 0 errors |
| Navbar, in headless Chromium via a throwaway harness (not shipped) | 27 / 27: EN/Dari/Pashto, signed in/out, 390-1920 px, 10 resizes per case, no overlap, consistent collapse/expand, selector always usable, language switch with the menu open, real two-tab language + theme sync |
| Earlier browser checks (see the table below) | 96 renders, 37 behaviour checks, 4,188 text nodes contrast audit: all passed |
| `vite build` | **NOT RUN** (registry unreachable) |

Preservation audit against `ariana-smart-stage7-part1.zip`: `backend/`, `supabase/` and `samples/` byte-identical; `api.js`,
`AuthProvider.jsx`, `mockAuth.js`, `applicationRules.js`, `documentRules.js` unchanged; 385 translation keys per language before
and after (none removed or added); the only changed values are 11 digit-script conversions in each of Dari and Pashto plus the
refreshed `about.statusText` in all three languages.

Limitations that remain in force (documented below and in `docs/TRANSLATION_REVIEW.md`):
- **Dari and Pashto translations need native-speaker review.** None has been reviewed; the legal/privacy/consent wording (section A of the review list) matters most.
- **No Dari/Pashto web font is bundled.** The layout was checked only with the sandbox's fallback fonts.
- **Navbar measurements used the sandbox fallback font** (a wide one). The width at which the signed-in English header expands will differ with real fonts; recheck in your browsers.
- The browser results come from a harness with React 19 and a stub router, not the real toolchain; Safari, Firefox, real devices, screen readers, real Supabase and real Google Sheets were not tested.

## Starting point
`ariana-smart-stage7-part1.zip` extracted as-is. It already had the `en`/`prs`/`pus` dictionaries, language selector and
persistence (Part 1), plus a basic theme (`ThemeProvider`, `ThemeToggle`, dark tokens, a pre-paint script). This part hardened
and tested those, and fixed what a visual pass showed. Nothing from earlier stages was removed.

## What changed

### Theme system
- `src/theme/core.js` (new, pure and unit-tested): store with `getTheme / setTheme / toggleTheme / isExplicit / syncFromStorage / onSystemChange / subscribe`.
  An explicit choice is saved (`localStorage['ariana-theme']`) and always wins; with no choice the theme follows the OS **live**; invalid/tampered values are ignored; blocked storage never breaks the toggle; other tabs stay in step.
- `ThemeProvider.jsx` now wraps the store (`useSyncExternalStore`), listens to `prefers-color-scheme` and the `storage` event. `useTheme()` keeps its old shape (`theme`, `toggleTheme`) and adds `explicit`, `setTheme`.
- `ThemeToggle.jsx`: a real `<button>` whose accessible name says what it will do ("Switch to dark theme"), translated in all three languages; icon shows the theme you would switch to; keyboard operable.
- `index.html`: pre-paint script also sets `<meta name="theme-color">`; a critical `html` background (light/dark) prevents a white flash in `npm run dev` where CSS arrives with the JS. Both pre-paint scripts are **executed in tests**, not just pattern-matched.
- `tokens.css`: new tokens `--input-border`, `--placeholder`, `--disabled-bg/-text/-border`, `--overlay`, and script-aware `--lh-*`. Control borders were about 1.3:1 and are now at least 3.8:1 (WCAG 1.4.11); disabled buttons/inputs use real colours instead of opacity; placeholders have their own AA colour; `color-scheme` makes native date pickers, scrollbars and the file input follow the theme. Hero, page headers, CTA band and footer stay navy in both themes (brand identity unchanged).

### RTL / LTR
- Components: `Ltr` (isolates Latin text such as e-mails, references, route/airport codes), `RoutePair` (replaces the text `KBL → DXB`: U+2192 never mirrors, so in RTL the arrow pointed back at the origin), `FormField` (e-mail/phone/password/number inputs are LTR but right-aligned in RTL; name fields use `dir="auto"`).
- Arabic-script typography: letter-spacing and upper-casing are switched off for `:lang(prs/pus)` (letter-spacing breaks joined letters); taller line-height for body, headings and buttons.
- Navbar: the fixed 1180px breakpoint was replaced by **measure-and-collapse**. The bar shows the desktop layout, measures whether it overflows, and falls back to the existing mobile menu only when it does (always at or below 1180px). It re-measures on resize, language change and sign-in/out, expands again when there is room, and runs before paint (no flash). The compact rules exist once (`.site-header[data-compact='true']`).
- Tables: wide tables now scroll inside their container instead of being clipped at tablet widths; they still stack into cards on phones.
- Pre-existing layout bugs found and fixed: the form-legend step number was `position:absolute` (inherited from the Home steps rule) and floated at the top of the page; inputs in the same grid row drifted down when a neighbour had a hint (`.field { align-content: start }`).
- Dialogs: `window.confirm` (cannot follow theme, direction or fonts) was replaced by an in-app `ConfirmDialog` built on native `<dialog>` (modal, Escape closes, backdrop click cancels, focus starts on **Cancel**). Uses existing translations (`documents.confirmDelete`, `documents.delete`, `apply.cancel`); no new keys.

### Localization (display only)
`lib/format.js`, exposed as `useI18n().format` (`number`, `year`, `date`, `duration`, `fileSize`):
- **Calendar:** always Gregorian (`-u-ca-gregory`). Browsers would otherwise show Dari/Pashto dates in Solar Hijri, which would disagree with the Gregorian date pickers and stored travel dates.
- **Digits:** Persian digits (۰–۹) in Dari and Pashto, Latin in English. Static dictionary digits (12 strings) were converted to match so one sentence never mixes digit sets.
- **Dates:** a stored `YYYY-MM-DD` never shifts with the viewer's time zone; timestamps use their date part exactly like the old `.slice(0, 10)`; unparseable values are shown as-is.
- **Pashto fallback:** some browser builds ship **no Pashto locale data at all** (the Chromium used here is one; it silently produced English digits). Pashto therefore falls back to Persian (`fa-AF`), which uses the same digits, and only then to English.
- Applied to: dashboard (totals, counts, passengers, dates), documents (sizes, dates, hint numbers), route durations, Home counts and step numbers, application form step numbers, footer year.
- **Never converted:** application references, route codes, IATA codes, e-mail addresses (they stay Latin, in LTR islands). Request payloads, stored dates, ticket/route data and API contracts are unchanged (a test checks the payload).
- `about.statusText` (stale "Stage 7 (part 1)") refreshed in all three languages.

## Verification: what actually ran

| Check | Result |
|---|---|
| Backend tests (`backend`, `node --test`) | **73 / 73 pass** (unchanged) |
| Frontend tests (`frontend`, `node --test`) | **85 / 85 pass**: applicationRules 5, documentRules 4, validation 5, i18n 18, **theme 16 (incl. language/theme cross-tab sync), format 13, rtl 19, translationReview 3** (new) |
| Secrets scan (`npm run scan:secrets`) | passed |
| Syntax check, every `.js` under `backend/` and `frontend/` (`node --check`) | 0 failures |
| Compile of the whole frontend (all 63 `src` files, esbuild) | 0 errors |
| `vite build` (the real production build) | **NOT RUN**: no network, `npm install` cannot reach the registry and nothing is cached |
| Browser render with a throwaway harness (see below) | 96 renders (8 pages × 3 languages × 2 themes × 2 widths): 0 console errors, 0 horizontal overflow, correct `lang`/`dir`/theme |
| Header: collisions at 11 widths × 3 languages × signed in/out; then a 27-check final pass | 0 collisions; collapse/expand verified incl. resize round trips (10 resizes per case), language switch with the mobile menu open, selector always visible, and a real two-tab language+theme sync |
| Behaviour in the browser (37 checks) | 37 / 37: theme toggle, persistence, keyboard, OS follow/override, **no wrong-theme flash** (MutationObserver), language/RTL switching and persistence, apply → dashboard → upload → delete → log out, in English and Dari |
| Rendered text contrast, 4,188 text nodes | 0 below AA (text on gradients is excluded from sampling) |

The new tests cover: direction per locale in the registry, the store **and the executed pre-paint script**; language × theme combinations; theme persistence, system following, tampered/blocked storage, cross-tab sync; localized numbers, dates (no Solar Hijri, no time-zone shift), durations, file sizes, Pashto fallback; no physical CSS properties; mirrored arrows; Arabic-script typography; token parity and WCAG contrast in both themes; no hard-coded colours on themed surfaces; the review list matching the dictionaries.

Existing test changed on purpose: the route-duration test now expects Persian digits for Dari/Pashto, and the digit-hygiene test now forbids Arabic-Indic and stray Latin digits instead of all Persian digits.

### About the browser harness (read this before trusting the screenshots)
`npm install` is impossible here, so the UI was **not** built with the project's own toolchain. To still look at the real components I bundled the real `src/` with esbuild using React **19** from the sandbox, a **stub** for `react-router-dom` (hash router) and the dev mock auth, then drove it with headless **Chromium** (Playwright). So: the React/CSS/i18n code is the real code, but the runtime is not exactly yours (React 18, real router, Vite). The harness is not part of this ZIP. It is evidence, not a substitute for `npm run build` and a manual pass in the browsers you care about.

## NOT verified: do not assume these work
1. `npm run build` / `npm run dev` with the real dependencies (React 18, react-router-dom 6, Vite 5). **Run `cd frontend && npm install && npm run build` first.**
2. Browsers other than Chromium (Safari, Firefox, mobile browsers); real devices; screen readers; real keyboard-only walkthrough in a production build.
3. Real Supabase, real Storage, real Google Sheets (unchanged and still unverified from earlier stages).
4. Dari and Pashto text quality: see `docs/TRANSLATION_REVIEW.md`. **No native speaker has reviewed any of it.**
5. Fonts: no Dari/Pashto web font is bundled. The sandbox had no Vazirmatn/Noto Naskh, so screenshots used fallback fonts. Line-height and header widths were tuned against those; recheck with your fonts.
6. Header collapse threshold: in this sandbox's wide fallback font the signed-in English header needed about 1400px to stay expanded (below that it shows the hamburger menu, by design). With Segoe UI / SF / Roboto it will expand earlier. Not measured on real font stacks.

## Known limitations
- Native controls follow the **browser's** language, not the app's: the file picker text ("Choose file / No file chosen") and the date-picker format.
- Dates in tables show the stored UTC date (same meaning as before), not the viewer's local date.
- Pashto date wording/order comes from the browser's locale data (or the Persian fallback). Needs a Pashto reviewer.
- A pre-existing rule (`.notice` gold start-border in `pages.css`) is overridden by `auth.css` and has no effect. Left alone to avoid restyling unrelated sections.
- The theme is saved in the browser (and, as before, sent along when the profile is saved); the language is browser-only.
- Supabase e-mails and backend error text are not localized (unchanged).

## Files
New (10): `docs/TRANSLATION_REVIEW.md`; `frontend/src/theme/core.js`; `frontend/src/components/ui/{ConfirmDialog,Ltr,RoutePair}.jsx`; `frontend/test/{theme,format,rtl,translationReview}.test.js`; `frontend/test/helpers/{css,prepaint}.js`.
Modified (26 + docs): `frontend/index.html`; `frontend/package.json` (0.7.1); `src/theme/ThemeProvider.jsx`; `src/components/ui/{ThemeToggle,FormField,RouteCard}.jsx`; `src/components/layout/{Navbar,Footer}.jsx`; `src/i18n/{core.js,index.jsx,en.js,prs.js,pus.js}`; `src/lib/format.js`; `src/pages/{Apply,Dashboard,Documents,Home,Profile,Register,Travel}.jsx`; `src/styles/{tokens,base,components,layout,auth}.css`; `test/i18n.test.js`; `README.md`; `docs/{DESIGN_SYSTEM,PLAN}.md`.

## Not started
AI assistant (Part 3). Admin review UI, PDF export and the security review (Stages 8–9).
