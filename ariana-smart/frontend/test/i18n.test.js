import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_LOCALE, DICTIONARIES, LOCALES, LOCALE_CODES, STORAGE_KEY,
  applyDocumentLanguage, createLocaleStore, createTranslator, getDirection,
  isSupportedLocale, readStoredLocale, writeStoredLocale
} from '../src/i18n/core.js';
import { AIRPORTS, TRIP_TYPES } from '../src/lib/applicationRules.js';
import { DOC_TYPES, ALLOWED_MIME } from '../src/lib/documentRules.js';
import { sampleRoutes, statusKeys } from '../src/data/routes.js';
import { formatDuration } from '../src/lib/format.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');

// ---- small helpers -------------------------------------------------------------------------
/** Flattens a dictionary to { 'a.b.0.c': 'leaf string' }. */
function flatten(node, prefix = '', out = {}) {
  if (typeof node === 'string') out[prefix] = node;
  else if (Array.isArray(node)) node.forEach((v, i) => flatten(v, prefix ? `${prefix}.${i}` : String(i), out));
  else if (node && typeof node === 'object') Object.entries(node).forEach(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k, out));
  else out[prefix] = node; // non-string leaf: reported by the "only strings" test
  return out;
}
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const has = (dictKey, path) => path.split('.').reduce((n, k) => (n == null ? undefined : n[k]), DICTIONARIES[dictKey]) !== undefined;

function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), _m: m };
}
const brokenStorage = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('QuotaExceededError'); }
};
function fakeDoc() {
  const attrs = {};
  const meta = { content: '', setAttribute(k, v) { if (k === 'content') this.content = v; } };
  return {
    title: '',
    documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: (k) => attrs[k] },
    querySelector: (sel) => (sel === 'meta[name="description"]' ? meta : null),
    _meta: meta
  };
}

const NON_EN = LOCALE_CODES.filter((c) => c !== 'en');

// ---- translation loading -------------------------------------------------------------------
test('English, Dari and Pashto are registered with the right direction', () => {
  assert.deepEqual(LOCALE_CODES.sort(), ['en', 'prs', 'pus']);
  assert.equal(DEFAULT_LOCALE, 'en');
  assert.equal(LOCALES.en.dir, 'ltr');
  assert.equal(LOCALES.prs.dir, 'rtl');
  assert.equal(LOCALES.pus.dir, 'rtl');
  for (const code of LOCALE_CODES) {
    assert.equal(typeof DICTIONARIES[code], 'object', `${code} dictionary loaded`);
    assert.ok(LOCALES[code].label.length > 0);
  }
  assert.equal(getDirection('prs'), 'rtl');
  assert.equal(getDirection('nope'), 'ltr');
  assert.ok(isSupportedLocale('pus'));
  assert.ok(!isSupportedLocale('fa'));
  assert.ok(!isSupportedLocale('__proto__'));
  assert.ok(!isSupportedLocale(undefined));
});

test('dictionaries mirror English: same keys, same array lengths, same {placeholders}', () => {
  const en = flatten(DICTIONARIES.en);
  for (const code of NON_EN) {
    const other = flatten(DICTIONARIES[code]);
    assert.deepEqual(Object.keys(other).sort(), Object.keys(en).sort(), `${code}: key set differs from English`);
    for (const [path, value] of Object.entries(en)) {
      assert.equal(placeholders(other[path]), placeholders(value), `${code}: placeholders differ at ${path}`);
    }
  }
});

test('every dictionary value is a non-empty string', () => {
  for (const code of LOCALE_CODES) {
    for (const [path, v] of Object.entries(flatten(DICTIONARIES[code]))) {
      assert.equal(typeof v, 'string', `${code}.${path} must be a string`);
      assert.ok(v.trim().length > 0, `${code}.${path} is empty`);
    }
  }
});

test('Dari and Pashto are really translated (Arabic script, not copied English)', () => {
  const en = flatten(DICTIONARIES.en);
  const KEEP_LATIN = new Set(['brand.name', 'documents.mime.application/pdf']);
  for (const code of NON_EN) {
    for (const [path, v] of Object.entries(flatten(DICTIONARIES[code]))) {
      if (KEEP_LATIN.has(path)) continue;
      assert.ok(/[\u0600-\u06FF]/.test(v), `${code}.${path} has no Arabic-script text: ${v}`);
      if (/[A-Za-z]/.test(en[path])) assert.notEqual(v, en[path], `${code}.${path} is identical to English`);
    }
  }
});

test('script hygiene: Dari uses Persian letters, Pashto uses Pashto letters', () => {
  const dari = Object.values(flatten(DICTIONARIES.prs)).join('');
  const pashto = Object.values(flatten(DICTIONARIES.pus)).join('');
  // Dari: no Arabic yeh/kaf, and none of the Pashto-only letters.
  for (const ch of ['\u064A', '\u0643', '\u06AB', '\u067C', '\u0689', '\u069A', '\u0693', '\u0681', '\u0685', '\u06BC', '\u0696', '\u06D0', '\u06CD']) {
    assert.ok(!dari.includes(ch), `Dari contains U+${ch.codePointAt(0).toString(16).toUpperCase()}`);
  }
  // Pashto: ګ (U+06AB) not گ (U+06AF); ک (U+06A9) not ك (U+0643).
  for (const ch of ['\u06AF', '\u0643']) {
    assert.ok(!pashto.includes(ch), `Pashto contains U+${ch.codePointAt(0).toString(16).toUpperCase()}`);
  }
  // Digits (Stage 7 part 2): the app now inserts Persian digits (U+06F0-06F9) for numbers, so static text uses the
  // same ones. Arabic-Indic digits (U+0660-0669) must not appear, and neither may stray Latin digits (outside
  // {placeholders} and Latin tokens such as "5 MB" units/words), or one sentence would mix two digit sets.
  assert.ok(!/[\u0660-\u0669]/.test(dari + pashto), 'Arabic-Indic digits found');
  for (const [lang, dict] of [['prs', DICTIONARIES.prs], ['pus', DICTIONARIES.pus]]) {
    for (const [key, value] of Object.entries(flatten(dict))) {
      const text = String(value).replace(/\{\w+\}/g, '');
      assert.ok(!/(?<![A-Za-z0-9_-])[0-9]+(?![A-Za-z0-9_-])/.test(text), `${lang}.${key} has Latin digits: ${value.slice(0, 60)}`);
    }
  }
});

test('every static t("...") key used in the source exists in all three dictionaries', () => {
  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(jsx?|js)$/.test(name)) files.push(p);
    }
  })(join(ROOT, 'src'));
  const used = new Set();
  for (const f of files) {
    if (f.includes(`${join('src', 'i18n')}`)) continue;
    for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(\s*(['"])([A-Za-z0-9_.]+)\1/g)) used.add(m[2]);
  }
  assert.ok(used.size > 100, `expected many keys, found ${used.size}`);
  for (const key of used) for (const code of LOCALE_CODES) assert.ok(has(code, key), `${code} is missing "${key}"`);
});

test('dynamic keys (status, airports, error codes, document types, ...) exist in all dictionaries', () => {
  const keys = [];
  const add = (prefix, codes) => codes.forEach((c) => keys.push(`${prefix}.${c}`));
  const codesIn = (file, re) => [...src(file).matchAll(re)].map((m) => m[1]);

  statusKeys.forEach((k) => keys.push(`status.${k}.label`, `status.${k}.desc`));
  AIRPORTS.forEach((c) => keys.push(`airports.${c}.city`, `airports.${c}.name`));
  [...new Set(sampleRoutes.map((r) => r.frequency))].forEach((f) => keys.push(`routes.freq.${f}`));
  ['home', 'about', 'travel', 'apply', 'assistant', 'contact'].forEach((k) => keys.push(`nav.${k}`));
  add('apply.trip', TRIP_TYPES);
  add('dashboard.trip', TRIP_TYPES);
  add('documents.types', DOC_TYPES);
  add('documents.mime', ALLOWED_MIME);
  add('profile.themes', ['light', 'dark']);
  ['not_configured', 'unsafe_key', 'mock'].forEach((m) => keys.push(`auth.config.${m}.title`, `auth.config.${m}.text`));
  ['assistant', 'contact'].forEach((p) => keys.push(`soon.pages.${p}.title`, `soon.pages.${p}.stage`));

  // Error CODES returned by the validators map to dictionary keys: read them from the real source files.
  add('auth.errors', [
    ...codesIn('src/lib/validation.js', /return '(\w+)'/g),
    ...codesIn('src/lib/authErrors.js', /return '(\w+)'/g),
    'passwordRequired', 'notConfigured'
  ]);
  add('apply.errors', codesIn('src/lib/applicationRules.js', /errors\.\w+ = '(\w+)'/g));
  add('documents.errors', [
    ...codesIn('src/lib/documentRules.js', /return '(\w+)'/g),
    ...codesIn('src/lib/api.js', /return '(\w+)'/g).filter((c) => c !== 'validation'),
    'tooMany', 'applicationClosed', 'notFound', 'fileTooLarge', 'fileType'
  ]);
  add('apply.formErrors', codesIn('src/lib/api.js', /code: '(\w+)'/g).filter((c) => c !== 'validation'));

  assert.ok(keys.length > 80);
  for (const key of new Set(keys)) for (const code of LOCALE_CODES) assert.ok(has(code, key), `${code} is missing "${key}"`);
});

// ---- translator ----------------------------------------------------------------------------
test('translator returns the active language, interpolates, and returns arrays as-is', () => {
  const en = createTranslator('en');
  const prs = createTranslator('prs');
  const pus = createTranslator('pus');
  assert.equal(en('nav.login'), 'Log in');
  assert.equal(prs('nav.login'), DICTIONARIES.prs.nav.login);
  assert.equal(pus('nav.login'), DICTIONARIES.pus.nav.login);
  assert.notEqual(prs('nav.login'), en('nav.login'));
  assert.notEqual(pus('nav.login'), prs('nav.login'));
  assert.match(prs('dashboard.welcome', { name: 'Ali' }), /Ali/);
  assert.match(pus('explorer.count', { count: 2, total: 6 }), /2.*6|6.*2/);
  assert.equal(en('explorer.count', { count: 2, total: 6 }), 'Showing 2 of 6 sample routes');
  assert.equal(en('dashboard.welcome', {}), 'Welcome, {name}', 'unknown placeholder is left as written');
  assert.ok(Array.isArray(pus('faq.items')) && pus('faq.items').length === DICTIONARIES.en.faq.items.length);
});

test('translator falls back to English, then to the key; unsupported locale uses English', () => {
  const missing = [];
  const t = createTranslator('prs', { onMissing: (p, c) => missing.push([p, c]) });
  assert.equal(t('totally.unknown.key'), 'totally.unknown.key');
  assert.deepEqual(missing, [['totally.unknown.key', 'prs']]);
  assert.equal(createTranslator('xx')('nav.login'), 'Log in');
  assert.equal(createTranslator(undefined)('nav.login'), 'Log in');
});

test('route durations are formatted per language (Latin digits in English, Persian digits in Dari/Pashto)', () => {
  assert.equal(formatDuration(190, createTranslator('en')), '3h 10m');
  assert.equal(formatDuration(60, createTranslator('en')), '1h 00m');
  const prs = formatDuration(190, createTranslator('prs'));
  const pus = formatDuration(190, createTranslator('pus'));
  // Stage 7 part 2: numbers in Dari/Pashto use the Persian digits \u06F0-\u06F9, so 3 and 10 become \u06F3 and \u06F1\u06F0.
  assert.match(prs, /\u06F3.*\u06F1\u06F0/);
  assert.match(pus, /\u06F3.*\u06F1\u06F0/);
  assert.ok(/[\u0600-\u06FF]/.test(prs) && /[\u0600-\u06FF]/.test(pus));
});

// ---- language switching --------------------------------------------------------------------
test('document lang, dir, title and description follow the language', () => {
  const doc = fakeDoc();
  for (const code of LOCALE_CODES) {
    applyDocumentLanguage(doc, code);
    assert.equal(doc.documentElement.getAttribute('lang'), code);
    assert.equal(doc.documentElement.getAttribute('dir'), LOCALES[code].dir);
    assert.equal(doc.title, DICTIONARIES[code].meta.title);
    assert.equal(doc._meta.content, DICTIONARIES[code].meta.description);
  }
  applyDocumentLanguage(doc, 'bogus'); // unsupported -> English / ltr, never throws
  assert.equal(doc.documentElement.getAttribute('lang'), 'en');
  assert.equal(doc.documentElement.getAttribute('dir'), 'ltr');
  assert.doesNotThrow(() => applyDocumentLanguage(null, 'en'));
});

test('switching language updates the document immediately and notifies subscribers', () => {
  const doc = fakeDoc();
  const store = createLocaleStore({ storage: fakeStorage(), doc });
  assert.equal(store.getLocale(), 'en');
  assert.equal(doc.documentElement.getAttribute('dir'), 'ltr');

  let calls = 0;
  const off = store.subscribe(() => { calls += 1; });

  assert.equal(store.setLocale('prs'), true);
  assert.equal(store.getLocale(), 'prs');
  assert.equal(doc.documentElement.getAttribute('lang'), 'prs');
  assert.equal(doc.documentElement.getAttribute('dir'), 'rtl');
  assert.equal(calls, 1);

  assert.equal(store.setLocale('pus'), true);
  assert.equal(doc.documentElement.getAttribute('lang'), 'pus');
  assert.equal(doc.documentElement.getAttribute('dir'), 'rtl');

  assert.equal(store.setLocale('en'), true);
  assert.equal(doc.documentElement.getAttribute('dir'), 'ltr');
  assert.equal(calls, 3);

  store.setLocale('en'); // no change -> no notification
  assert.equal(calls, 3);

  off();
  store.setLocale('prs');
  assert.equal(calls, 3, 'unsubscribed listeners are not called');
});

test('unsupported language codes are rejected and change nothing', () => {
  const storage = fakeStorage();
  const doc = fakeDoc();
  const store = createLocaleStore({ storage, doc });
  for (const bad of ['fa', 'ps', 'de', '', null, undefined, 42, '__proto__']) {
    assert.equal(store.setLocale(bad), false);
  }
  assert.equal(store.getLocale(), 'en');
  assert.equal(storage._m.size, 0, 'nothing was saved');
});

// ---- persistence ---------------------------------------------------------------------------
test('the chosen language is saved and restored after a "reload"', () => {
  const storage = fakeStorage();
  const first = createLocaleStore({ storage, doc: fakeDoc() });
  first.setLocale('pus');
  assert.equal(storage.getItem(STORAGE_KEY), 'pus');

  // New store + new document = a page reload that shares the same localStorage.
  const doc2 = fakeDoc();
  const second = createLocaleStore({ storage, doc: doc2 });
  assert.equal(second.getLocale(), 'pus');
  assert.equal(doc2.documentElement.getAttribute('lang'), 'pus');
  assert.equal(doc2.documentElement.getAttribute('dir'), 'rtl');
  assert.equal(doc2.title, DICTIONARIES.pus.meta.title);

  second.setLocale('en');
  assert.equal(createLocaleStore({ storage, doc: fakeDoc() }).getLocale(), 'en');
});

test('a missing, invalid or tampered saved value falls back to English', () => {
  assert.equal(createLocaleStore({ storage: fakeStorage(), doc: fakeDoc() }).getLocale(), 'en');
  for (const bad of ['fa', 'EN', 'prs ', '<script>', '{"a":1}', '']) {
    const store = createLocaleStore({ storage: fakeStorage({ [STORAGE_KEY]: bad }), doc: fakeDoc() });
    assert.equal(store.getLocale(), 'en', `value ${JSON.stringify(bad)}`);
  }
  assert.equal(readStoredLocale(null), null);
  assert.equal(writeStoredLocale(fakeStorage(), 'nope'), false);
});

test('blocked storage does not break language switching for the session', () => {
  assert.equal(readStoredLocale(brokenStorage), null);
  assert.equal(writeStoredLocale(brokenStorage, 'prs'), false);
  const doc = fakeDoc();
  const store = createLocaleStore({ storage: brokenStorage, doc });
  assert.equal(store.getLocale(), 'en');
  assert.equal(store.setLocale('prs'), true);
  assert.equal(store.getLocale(), 'prs');
  assert.equal(doc.documentElement.getAttribute('dir'), 'rtl');
  assert.doesNotThrow(() => createLocaleStore({ storage: null, doc: null }));
});

// ---- wiring (static checks: the React tree itself is not rendered in these tests) -----------
test('index.html pre-paint script uses the same storage key and the same directions as core.js', () => {
  const html = src('index.html');
  assert.ok(html.includes(`localStorage.getItem('${STORAGE_KEY}')`), 'index.html must read the same key');
  const m = html.match(/var dirs = \{([^}]*)\}/);
  assert.ok(m, 'dirs map not found in index.html');
  const dirs = Object.fromEntries([...m[1].matchAll(/(\w+):\s*'(ltr|rtl)'/g)].map((x) => [x[1], x[2]]));
  assert.deepEqual(dirs, Object.fromEntries(LOCALE_CODES.map((c) => [c, LOCALES[c].dir])));
});

test('the selector is mounted in the navbar and the provider no longer hard-codes English', () => {
  assert.match(src('src/components/layout/Navbar.jsx'), /<LanguageSelector\s*\/>/);
  assert.doesNotMatch(src('src/main.jsx'), /locale="en"/);
  const selector = src('src/components/ui/LanguageSelector.jsx');
  assert.match(selector, /setLocale\(e\.target\.value\)/);
  assert.match(selector, /lang=\{code\}/);
  assert.match(src('src/styles/tokens.css'), /:lang\(prs\)/);
  assert.match(src('src/styles/tokens.css'), /:lang\(pus\)/);
});
