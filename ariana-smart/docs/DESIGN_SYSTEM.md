# Design system (Stage 2, updated in Stage 7 part 2)

## Principles
Deep navy and royal blue, white/neutral surfaces, one gold accent used sparingly. Original identity (no airline's logo or imagery is copied). Hero, page headers, CTA band and footer stay deep navy in both themes.

## Tokens (`src/styles/tokens.css`)
Components never hard-code colours on themed surfaces (a test enforces this); they use variables such as `--bg`, `--surface`, `--text`, `--text-muted`, `--border`, `--input-border`, `--placeholder`, `--link`, `--btn-*`, `--tone-*` (badge tones), `--disabled-*`, `--overlay`, `--shadow-*`, `--grad-*`.
- Light values live in `:root`; dark values override them under `[data-theme='dark']`. A test requires the dark block to redefine every themed token and every `var(--x)` used in CSS to be defined.
- `--border` is for decorative edges (cards, dividers). **Controls** (inputs, selects, radio cards, icon buttons) use `--input-border`, which meets 3:1 (WCAG 1.4.11).
- Disabled controls use `--disabled-bg/-text/-border` (a real colour set, not opacity). Placeholders use `--placeholder`.
- `color-scheme: light|dark` is set per theme so native widgets (date pickers, scrollbars, file input, `<select>` popups) follow the theme.
- Contrast is tested, not asserted: `test/rtl.test.js` computes WCAG ratios for every text pair in both themes (all at least 4.5:1; lowest today: 4.54 light, 4.52 dark) and for control borders and focus rings (at least 3:1; lowest 3.84 light, 4.03 dark). A browser audit of rendered pages also found no text below AA (gradient backgrounds excluded).

## Theme behaviour (`src/theme/core.js`, `ThemeProvider.jsx`, `ThemeToggle.jsx`)
- Explicit choice is saved in `localStorage['ariana-theme']` and always wins. With no saved choice the theme follows the OS setting, live.
- `index.html` runs a tiny pre-paint script (same rules, tested by executing it) and sets a critical `html` background colour and `<meta name="theme-color">`, so there is no wrong-theme flash. Keep its colours in sync with `THEME_COLORS` in `theme/core.js` (a test checks this).
- The toggle is a real `<button>`; its accessible name describes the action ("Switch to dark theme").

## RTL and localization
- Direction comes from `<html dir>` (`en` LTR; `prs`, `pus` RTL), set before first paint and on every language change. Do **not** duplicate components for RTL.
- All spacing/alignment uses CSS logical properties (`margin-inline`, `padding-inline`, `inset-inline-start`, `text-align: start`, `border-inline-start`...). A test fails on `margin-left`, `padding-right`, `text-align: left`, `float`, etc. The only reviewed exceptions: the select chevron `background-position` (with an RTL override) and right-aligning LTR inputs on RTL pages.
- Directional icons use the `flip` prop (mirrors under `[dir='rtl']`); the rotated plane on route cards has its own RTL rule. Never put a text arrow (`→`) between route codes: use `RoutePair`.
- Mixed scripts: wrap Latin identifiers (e-mail, application reference, route/airport code) in `<Ltr>`; e-mail/phone/password/number inputs are LTR (right-aligned on RTL pages); name inputs use `dir="auto"`.
- Arabic-script typography: letter-spacing and `text-transform` are disabled for `:lang(prs)`/`:lang(pus)`; `--lh-body/--lh-heading/--lh-btn/--lh-tight` are taller for those languages. `:lang(prs), :lang(pus)` switch to the Persian font stack. Fonts are NOT bundled; self-host Vazirmatn (or similar) for consistent rendering.
- Display formatting (`lib/format.js`, via `useI18n().format`): Gregorian calendar, Persian digits in Dari/Pashto, Latin in English. Display only; identifiers and stored values are never converted. Pashto falls back to Persian locale data when a browser lacks Pashto.
- All user-visible text is in `src/i18n/en.js` (source of truth), `prs.js` (Dari) and `pus.js` (Pashto), read through `t('path.to.key')`. The three files must keep identical keys; `test/i18n.test.js` fails otherwise. Dari/Pashto text is unreviewed: see `docs/TRANSLATION_REVIEW.md`.

## Components (`src/components/ui`)
Button (links via `to`, or real `<button>`, `disabled` for unbuilt features), Card, Badge, StatusBadge (the 7 application statuses), Accordion (aria-expanded/controls), Section, PageHeader, Container, Logo, ThemeToggle, LanguageSelector, Icon (local Lucide-style set), RouteCard, RoutePair (direction-aware origin/destination), Ltr (LTR isolate for Latin text), ConfirmDialog (themed native `<dialog>`), FormField/FormControls, HeroArt (original inline SVG, cannot fail to load).

## Responsive behaviour
The header menu is **adaptive**: `Navbar.jsx` shows the full desktop bar when it fits and collapses to the hamburger menu when the link panel would overflow (always at or below 1180px); the width needed depends on language, sign-in state and font, so there is no single breakpoint. The compact rules live once under `.site-header[data-compact='true']`. Other breakpoints: 960, 900, 800, 720 (tables become stacked cards; wider tables scroll inside their container), 640, 600, 480.

## UI refinement pass (Stage 7, after Part 2)
Presentation-only changes, in `src/styles/refine.css` (loaded last) plus a few tokens in `tokens.css`:
- Tokens added: `--accent-line` (gold), `--focus-ring`, `--row-hover` (both themes). `--container` is now 1280px and the header uses the same width and gutter as page content, so edges align on wide screens. Radii: md 12px, lg 18px.
- Active navigation item: thin gold underline (desktop) or gold bar on the reading-start edge (compact menu).
- Sentence-case labels (no tracked capitals) for eyebrows, table headers, footer headings, route codes.
- Hero flight-path arc, route-card accent strip and the step connector use logical offsets or an explicit RTL override so they mirror in RTL.
- Form focus: border colour plus a 3px ring; invalid state keeps the error colour.
- Dashboard: the "total applications" card has `className="stat-card"` for a large number. No logic changed.
