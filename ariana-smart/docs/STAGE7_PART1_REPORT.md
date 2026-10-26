# Stage 7, Part 1 report: English, Dari and Pashto

Scope: interface languages only. **Not done (by instruction): themes work, full RTL polish, AI assistant.**

## Starting point
`ariana-smart-stage6.zip` extracted as-is. The project already routed all English text through `t()` and an `I18nProvider` scaffold (Stage 2), so this part extends that architecture instead of replacing it. Language codes are `en`, `prs` (Dari) and `pus` (Pashto), as requested; the old scaffold comments mentioned `fa`/`ps`, those were replaced.

## What changed
- `src/i18n/core.js` (new): pure logic with no React: locale registry + direction, translator (fallback to English, `{placeholder}` filling), guarded localStorage read/write, `<html lang dir>` + title + meta description updater, and a small observable locale store.
- `src/i18n/index.jsx`: provider now uses the store (`useSyncExternalStore`); `useI18n()` also returns `setLocale`, `locales`, `dir`.
- `src/i18n/prs.js`, `src/i18n/pus.js` (new): full dictionaries mirroring `en.js` (navigation, hero/home, travel, FAQ, auth + validation messages, dashboard, ticket application + validation, documents + upload errors, profile, status labels, airports, placeholders, 404).
- `src/i18n/en.js`: added `meta`, `language`, `common.available`, `routes.durationFmt`, `documents.units`; refreshed the stale "Stage 5" build-status text and the languages support card.
- `src/components/ui/LanguageSelector.jsx` (new) mounted in `Navbar.jsx`; native `<select>` with each language in its own script, `lang`/`dir` per option.
- `src/main.jsx`: provider no longer hard-codes `locale="en"`.
- `index.html`: inline pre-paint script sets `lang`/`dir` from the saved choice (no flash of wrong direction).
- Small de-hardcoding: file-size units (`Documents.jsx`) and route durations (`data/routes.js` now stores `minutes`; `lib/format.js` formats them per language; `RouteCard.jsx`, `Travel.jsx`).
- CSS: `:lang(prs), :lang(pus)` select the Persian-script font stack (the old rule targeted `fa`/`ps`); selector styles in `layout.css` using logical properties.
- `Home.jsx`: the languages card badge is now "Available" instead of "Planned".
- `frontend/package.json` version 0.7.0; README and DESIGN_SYSTEM notes updated.
- Backend, database, Supabase auth, private uploads and Google Sheets code: **not modified**.

## Tests actually run (this sandbox, `node --test`)
- Frontend: **32 tests, 32 pass, 0 fail** (14 existing + 18 new in `test/i18n.test.js`).
- Backend: **73 tests, 73 pass, 0 fail** (unchanged; includes the secrets scan).
- Syntax check: every `.js`/`.jsx` file under `frontend/src` (53 files) parsed with the TypeScript compiler's parser, 0 errors. This is a parse check only, not a build.

New tests cover: three locales load with correct direction; all dictionaries have identical keys/array lengths/placeholders; no empty values; Dari/Pashto are not copied English; Dari/Pashto letter hygiene; every `t('...')` key used in the source (and every status/airport/error-code/document-type key derived from the real validators) exists in all three languages; translator interpolation and fallback; switching updates `lang`, `dir`, title and description and notifies subscribers; invalid codes are rejected; the choice survives a simulated reload; invalid/tampered/blocked storage falls back safely; `index.html` pre-paint script matches `core.js`; the selector is mounted.

## NOT tested, do not assume these work
1. **The React UI was not built, rendered or clicked.** `npm install` has no network in this sandbox, so `vite`, `react` and `react-dom` were unavailable. The tests exercise the pure i18n logic with fake storage/document objects; they do not render `I18nProvider`, `LanguageSelector` or any page. First thing to do locally: `cd frontend && npm install && npm run dev`, switch languages, reload.
2. **No real browser check** of `<html lang dir>`, `localStorage`, fonts, or the selector layout in the navbar (especially the 1180px breakpoint and RTL).
3. `lang="prs"` / `lang="pus"` are valid ISO 639-3 tags, but browser/screen-reader voice support for them varies.

## Translation quality: needs human review
Dari and Pashto text was written by an AI model with no native-speaker review. Terminology (e.g. تکت/ټکټ for ticket, تذکره for national ID) follows common Afghan usage but should be checked, especially legal/privacy wording (`faq`, `footer.disclaimer`, `apply.consentText`). English remains the fallback for any missing key.

## Known limitations / left for Part 2
- RTL is prepared (`dir` switches, logical CSS, mirrored arrows) but not polished: table/form alignment, the `→` in the dashboard route column, mixed Latin/Arabic text (route codes, emails, brand name) and the mobile menu need a visual pass.
- Numbers, dates and references stay in Latin digits / ISO dates everywhere.
- Fonts: the Persian stack names Vazirmatn/Noto Naskh Arabic but no web font is bundled; users without them see system fallbacks.
- The language choice is stored in the browser only (not in the Supabase profile). It is not synced across tabs until reload.
- `soon.pages.assistant.stage` still says "Stage 7"; the AI assistant and themes were intentionally not started.
- Backend error responses are codes mapped in the browser; no backend text was translated. Emails sent by Supabase (confirmation/reset) are not localized.
