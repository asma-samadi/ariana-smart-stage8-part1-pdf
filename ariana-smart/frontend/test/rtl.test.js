import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { LOCALES, LOCALE_CODES, createLocaleStore } from '../src/i18n/core.js';
import { ROOT, contrast, read, ruleBody, themeTokens, vars } from './helpers/css.js';
import { runPrepaint } from './helpers/prepaint.js';

const cssFiles = readdirSync(join(ROOT, 'src/styles')).filter((f) => f.endsWith('.css'));
const allCss = cssFiles.map((f) => read(`src/styles/${f}`).replace(/\/\*[\s\S]*?\*\//g, '')).join('\n');
const walk = (dir) => readdirSync(join(ROOT, dir), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
const jsx = walk('src').filter((f) => f.endsWith('.jsx'));

// ---- direction switching ---------------------------------------------------------------------
test('English is LTR and Dari/Pashto are RTL, in the registry, the store and the pre-paint script', () => {
  const expected = { en: 'ltr', prs: 'rtl', pus: 'rtl' };
  for (const code of LOCALE_CODES) {
    assert.equal(LOCALES[code].dir, expected[code]);
    const attrs = {}; const doc = { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } }, querySelector: () => null };
    const store = createLocaleStore({ storage: { getItem: () => null, setItem() {} }, doc });
    store.setLocale(code);
    assert.deepEqual([attrs.lang, attrs.dir], [code, expected[code]], `store ${code}`);
    const pre = runPrepaint({ storage: { 'ariana-lang': code } }).attrs;
    assert.deepEqual([pre.lang, pre.dir], [code, expected[code]], `pre-paint ${code}`);
  }
});

test('pre-paint language script: invalid, missing or blocked storage means English/LTR', () => {
  for (const storage of [{}, { 'ariana-lang': 'fr' }, { 'ariana-lang': '<script>' }, { 'ariana-lang': 'toString' }, 'blocked']) {
    const a = runPrepaint({ storage }).attrs;
    assert.deepEqual([a.lang, a.dir], ['en', 'ltr']);
  }
});

test('language and theme are independent: every combination is applied by the pre-paint scripts', () => {
  for (const lang of LOCALE_CODES) for (const theme of ['light', 'dark']) {
    const a = runPrepaint({ storage: { 'ariana-lang': lang, 'ariana-theme': theme } }).attrs;
    assert.deepEqual([a.lang, a.dir, a['data-theme']], [lang, LOCALES[lang].dir, theme]);
  }
});

// ---- logical CSS ------------------------------------------------------------------------------
test('stylesheets use logical properties: no physical left/right margins, padding, borders, floats or alignment', () => {
  const offenders = [];
  for (const m of allCss.matchAll(/(margin-(?:left|right)|padding-(?:left|right)|border-(?:left|right)(?:-\w+)?|text-align\s*:\s*(?:left|right)|float\s*:\s*(?:left|right)|(?<![-\w])(?:left|right)\s*:)/g)) {
    offenders.push(m[0]);
  }
  // Allowed exceptions: the select chevron background-position (a background image has no logical variant; an
  // RTL override exists) and the explicit RTL-only alignment of LTR inputs, both reviewed.
  const allowed = new Set(['text-align: right', 'text-align:right']);
  const unexpected = offenders.filter((o) => !allowed.has(o));
  assert.deepEqual(unexpected, [], `physical properties found: ${unexpected.join(', ')}`);
  assert.match(allCss, /\[dir='rtl'\] \.select \{ background-position: left/);
  assert.match(allCss, /\[dir='rtl'\] \.input\[dir='ltr'\] \{ text-align: right; \}/);
});

test('logical properties are actually used for the layout-critical places', () => {
  for (const needle of ['margin-inline', 'padding-inline', 'inset-inline-start', 'text-align: start', 'text-align: end', 'border-inline-start', 'margin-inline-end']) {
    assert.ok(allCss.includes(needle), `${needle} used`);
  }
});

test('directional icons mirror in RTL, including the rotated plane on route cards', () => {
  assert.match(allCss, /\[dir='rtl'\] \.icon-flip \{ transform: scaleX\(-1\); \}/);
  assert.match(allCss, /\[dir='rtl'\] \.route-path \.icon-flip \{ transform: scaleX\(-1\) rotate\(45deg\); \}/);
  assert.match(read('src/components/ui/Icon.jsx'), /flip \? 'icon-flip '/);
  // every arrow usage passes `flip`
  for (const f of jsx) {
    const src = read(f);
    for (const m of src.matchAll(/<Icon[^>]*name="arrow"[^>]*>/g)) assert.match(m[0], /\bflip\b/, `${f}: ${m[0]}`);
    for (const m of src.matchAll(/iconEnd="arrow"[^>]*/g)) assert.match(m[0], /iconFlip/, `${f}: ${m[0]}`);
  }
});

test('no text arrows between route codes (they never mirror); RoutePair is used instead', () => {
  for (const f of jsx) assert.doesNotMatch(read(f), /\{[^}]*\}\s*[→←]\s*\{/, `${f} has a text arrow between expressions`);
  assert.match(read('src/components/ui/RoutePair.jsx'), /<Icon name="arrow" size=\{14\} flip \/>/);
});

test('Arabic-script typography: no letter-spacing / upper-casing for Dari and Pashto; taller line-height', () => {
  assert.match(allCss, /\*:lang\(prs\), \*:lang\(pus\)[^{]*\{ letter-spacing: normal !important; text-transform: none !important; \}/);
  const t = read('src/styles/tokens.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const rtlBlock = vars(ruleBody(t, ':lang(prs), :lang(pus), :lang(fa), :lang(ps)'));
  assert.ok(parseFloat(rtlBlock['--lh-body']) > parseFloat(vars(ruleBody(t, ':root'))['--lh-body']));
  assert.ok(parseFloat(rtlBlock['--lh-heading']) > parseFloat(vars(ruleBody(t, ':root'))['--lh-heading']));
  assert.match(rtlBlock['--font-body'], /--font-persian/);
  assert.match(read('src/styles/base.css'), /line-height: var\(--lh-body\)/);
});

test('mixed-script text: LTR islands, LTR input types, auto-direction name fields', () => {
  assert.match(read('src/components/ui/Ltr.jsx'), /<bdi dir="ltr"/);
  const ff = read('src/components/ui/FormField.jsx');
  for (const type of ['email', 'tel', 'url', 'password', 'number']) assert.ok(ff.includes(`'${type}'`), `${type} is LTR`);
  assert.match(ff, /dir=\{inputDir\}/);
  for (const [file, field] of [['Apply.jsx', 'fullName'], ['Apply.jsx', 'nationality'], ['Register.jsx', 'fullName'], ['Profile.jsx', 'fullName']]) {
    const line = read(`src/pages/${file}`).split('\n').find((l) => l.includes('<FormField') && (l.includes(`name="${field}"`) || (field === 'fullName' && l.includes('auth.fields.fullName'))));
    assert.ok(line && line.includes('dir="auto"'), `${file} ${field} uses dir="auto"`);
  }
  assert.match(read('src/pages/Apply.jsx'), /name="idDocumentNumber" dir="ltr"/);
});

test('the navbar collapses by measurement (not a fixed breakpoint) and the compact layout is written once', () => {
  const nav = read('src/components/layout/Navbar.jsx');
  assert.match(nav, /data-compact=\{compact\}/);
  assert.match(nav, /useLayoutEffect/);
  assert.match(nav, /scrollWidth - panel\.clientWidth/);
  assert.match(nav, /ResizeObserver/);
  assert.match(allCss, /\.site-header\[data-compact='true'\] \.nav-panel \{/);
  assert.doesNotMatch(allCss, /@media \(max-width: 1180px\)/, 'no second copy of the mobile menu rules behind a media query');
});

test('dialogs and dropdowns are themed and localized: no native confirm(), tokens only', () => {
  const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''); // comments may mention confirm()
  for (const f of jsx) assert.doesNotMatch(code(f), /window\.confirm|\bconfirm\(/, f);
  const dlg = read('src/components/ui/ConfirmDialog.jsx');
  assert.match(dlg, /<dialog/);
  assert.match(dlg, /showModal/);
  assert.match(dlg, /onCancel/);
  assert.match(dlg, /data-cancel/);
  const dialogCss = ruleBody(allCss, '.dialog');
  assert.match(dialogCss, /var\(--surface\)/);
  assert.match(dialogCss, /var\(--text\)/);
  assert.match(allCss, /\.dialog::backdrop \{ background: var\(--overlay\); \}/);
  assert.match(allCss, /\.select option \{ background: var\(--surface\); color: var\(--text\); \}/);
});

// ---- theme tokens ----------------------------------------------------------------------------
const THEMED = ['--bg', '--bg-alt', '--surface', '--surface-2', '--text', '--text-muted', '--border', '--input-border', '--placeholder',
  '--link', '--focus', '--btn-primary-bg', '--btn-primary-bg-hover', '--btn-secondary-bg', '--btn-secondary-bg-hover', '--btn-secondary-text',
  '--header-bg', '--banner-bg', '--banner-text', '--disabled-bg', '--disabled-text', '--disabled-border', '--overlay',
  '--tone-info-bg', '--tone-info-text', '--tone-warn-bg', '--tone-warn-text', '--tone-ok-bg', '--tone-ok-text',
  '--tone-bad-bg', '--tone-bad-text', '--tone-neutral-bg', '--tone-neutral-text', '--shadow-sm', '--shadow-md', '--shadow-lg', '--footer-bg'];

test('the dark theme redefines every themed token (nothing silently inherits a light value)', () => {
  const css = read('src/styles/tokens.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const dark = vars(ruleBody(css, "[data-theme='dark']"));
  const light = vars(ruleBody(css, ':root'));
  for (const k of THEMED) {
    assert.ok(k in light, `${k} defined for light`);
    assert.ok(k in dark, `${k} defined for dark`);
  }
  assert.match(ruleBody(css, "[data-theme='dark']"), /color-scheme: dark/, 'native controls (date pickers, scrollbars, file input) follow the theme');
  assert.match(ruleBody(css, ':root'), /color-scheme: light/);
});

test('every var(--token) used in the stylesheets is defined', () => {
  const defined = new Set(Object.keys(themeTokens().light));
  const used = new Set([...allCss.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
  const missing = [...used].filter((u) => !defined.has(u));
  assert.deepEqual(missing, []);
});

test('no hard-coded colours outside tokens in themed surfaces (hero/footer/CTA are navy by design in both themes)', () => {
  // Components that sit on the themed page background must use tokens. Allowed hard-coded colours are only the
  // brand-navy sections (hero, page header, CTA band, footer, header logo on navy) and the gold accent button.
  const themedFiles = ['components.css', 'auth.css'];
  const offenders = [];
  for (const f of themedFiles) {
    for (const line of read(`src/styles/${f}`).replace(/\/\*[\s\S]*?\*\//g, '').split('\n')) {
      if (!/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(line)) continue;
      if (/btn-accent|btn-outline-light|logo-light|data:image\/svg|--shadow|box-shadow: 0 6px 18px rgba\(242/.test(line)) continue;
      offenders.push(`${f}: ${line.trim().slice(0, 80)}`);
    }
  }
  assert.deepEqual(offenders, []);
});

// ---- contrast (WCAG 2.x), both themes ---------------------------------------------------------
const TEXT_PAIRS = [
  ['--text', '--bg'], ['--text', '--surface'], ['--text', '--surface-2'], ['--text', '--bg-alt'],
  ['--text-muted', '--bg'], ['--text-muted', '--bg-alt'], ['--text-muted', '--surface'], ['--text-muted', '--surface-2'], ['--text-muted', '--tone-info-bg'],
  ['--link', '--bg'], ['--link', '--bg-alt'], ['--link', '--surface'], ['--link', '--surface-2'], ['--link', '--tone-info-bg'],
  ['--btn-primary-text', '--btn-primary-bg'], ['--btn-primary-text', '--btn-primary-bg-hover'],
  ['--btn-secondary-text', '--btn-secondary-bg'], ['--btn-secondary-text', '--btn-secondary-bg-hover'],
  ['--tone-info-text', '--tone-info-bg'], ['--tone-warn-text', '--tone-warn-bg'], ['--tone-ok-text', '--tone-ok-bg'],
  ['--tone-bad-text', '--tone-bad-bg'], ['--tone-neutral-text', '--tone-neutral-bg'], ['--tone-bad-text', '--surface'],
  ['--banner-text', '--banner-bg'], ['--footer-text', '--footer-bg'],
  ['--placeholder', '--surface'], ['--placeholder', '--surface-2'],
  ['--disabled-text', '--disabled-bg']
];
const UI_PAIRS = [['--input-border', '--surface'], ['--input-border', '--surface-2'], ['--input-border', '--bg'], ['--focus', '--surface'], ['--focus', '--bg']];

for (const theme of ['light', 'dark']) {
  test(`${theme} theme: all text pairs reach WCAG AA (4.5:1)`, () => {
    const T = themeTokens()[theme];
    const failures = TEXT_PAIRS.map(([a, b]) => [a, b, contrast(T[a], T[b])]).filter(([, , r]) => r < 4.5);
    assert.deepEqual(failures.map(([a, b, r]) => `${a} on ${b} = ${r.toFixed(2)}`), []);
  });
  test(`${theme} theme: control boundaries and focus rings reach 3:1 (WCAG 1.4.11)`, () => {
    const T = themeTokens()[theme];
    const failures = UI_PAIRS.map(([a, b]) => [a, b, contrast(T[a], T[b])]).filter(([, , r]) => r < 3);
    assert.deepEqual(failures.map(([a, b, r]) => `${a} on ${b} = ${r.toFixed(2)}`), []);
  });
}

test('contrast helper sanity check', () => {
  assert.equal(contrast('#000000', '#ffffff').toFixed(1), '21.0');
  assert.equal(contrast('#777777', '#777777').toFixed(1), '1.0');
});
