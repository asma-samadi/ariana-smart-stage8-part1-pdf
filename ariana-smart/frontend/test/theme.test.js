import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY, THEMES, THEME_COLORS, applyTheme, createThemeStore, isTheme, readStoredTheme, systemTheme, writeStoredTheme
} from '../src/theme/core.js';
import { read } from './helpers/css.js';
import { runPrepaint } from './helpers/prepaint.js';

function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), _m: m };
}
const brokenStorage = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
function fakeDoc() {
  const attrs = {};
  const meta = { content: '', setAttribute(k, v) { if (k === 'content') this.content = v; } };
  return {
    documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: (k) => attrs[k] },
    querySelector: (sel) => (sel === 'meta[name="theme-color"]' ? meta : null),
    _meta: meta
  };
}
const media = (dark) => () => ({ matches: dark });

test('two themes exist and only they are valid', () => {
  assert.deepEqual([...THEMES], ['light', 'dark']);
  assert.ok(isTheme('light') && isTheme('dark'));
  for (const bad of ['', 'Dark', 'auto', null, undefined, 1, {}]) assert.equal(isTheme(bad), false);
});

test('the system preference is used when nothing is saved', () => {
  assert.equal(createThemeStore({ storage: fakeStorage(), doc: fakeDoc(), matchFn: media(true) }).getTheme(), 'dark');
  assert.equal(createThemeStore({ storage: fakeStorage(), doc: fakeDoc(), matchFn: media(false) }).getTheme(), 'light');
  assert.equal(systemTheme(() => { throw new Error('x'); }), 'light');
  assert.equal(systemTheme(undefined), 'light');
});

test('a saved choice beats the system preference', () => {
  const store = createThemeStore({ storage: fakeStorage({ [STORAGE_KEY]: 'light' }), doc: fakeDoc(), matchFn: media(true) });
  assert.equal(store.getTheme(), 'light');
  assert.equal(store.isExplicit(), true);
});

test('toggling updates <html data-theme>, the browser colour, saves, and notifies', () => {
  const storage = fakeStorage(); const doc = fakeDoc();
  const store = createThemeStore({ storage, doc, matchFn: media(false) });
  assert.equal(doc.documentElement.getAttribute('data-theme'), 'light');
  let calls = 0; const off = store.subscribe(() => calls++);
  store.toggleTheme();
  assert.equal(store.getTheme(), 'dark');
  assert.equal(doc.documentElement.getAttribute('data-theme'), 'dark');
  assert.equal(doc._meta.content, THEME_COLORS.dark);
  assert.equal(storage._m.get(STORAGE_KEY), 'dark');
  assert.equal(calls, 1);
  store.toggleTheme();
  assert.equal(doc.documentElement.getAttribute('data-theme'), 'light');
  assert.equal(doc._meta.content, THEME_COLORS.light);
  assert.equal(storage._m.get(STORAGE_KEY), 'light');
  assert.equal(calls, 2);
  off(); store.toggleTheme(); assert.equal(calls, 2, 'unsubscribed listeners are not called');
});

test('the chosen theme survives a simulated page reload', () => {
  const storage = fakeStorage();
  createThemeStore({ storage, doc: fakeDoc(), matchFn: media(false) }).setTheme('dark');
  const reloaded = createThemeStore({ storage, doc: fakeDoc(), matchFn: media(false) });
  assert.equal(reloaded.getTheme(), 'dark');
});

test('invalid values are rejected and a tampered saved value falls back to the system theme', () => {
  const store = createThemeStore({ storage: fakeStorage(), doc: fakeDoc(), matchFn: media(false) });
  assert.equal(store.setTheme('purple'), false);
  assert.equal(store.getTheme(), 'light');
  assert.equal(readStoredTheme(fakeStorage({ [STORAGE_KEY]: '<script>' })), null);
  assert.equal(createThemeStore({ storage: fakeStorage({ [STORAGE_KEY]: 'neon' }), doc: fakeDoc(), matchFn: media(true) }).getTheme(), 'dark');
  assert.equal(writeStoredTheme(fakeStorage(), 'neon'), false);
});

test('blocked storage and missing document do not break the theme', () => {
  const store = createThemeStore({ storage: brokenStorage, doc: fakeDoc(), matchFn: media(false) });
  assert.doesNotThrow(() => store.toggleTheme());
  assert.equal(store.getTheme(), 'dark');
  assert.doesNotThrow(() => createThemeStore({ storage: null, doc: null }));
  assert.doesNotThrow(() => applyTheme(null, 'dark'));
});

test('while following the system, OS changes apply; once chosen, they are ignored', () => {
  let dark = false;
  const doc = fakeDoc();
  const store = createThemeStore({ storage: fakeStorage(), doc, matchFn: () => ({ matches: dark }) });
  dark = true; store.onSystemChange();
  assert.equal(store.getTheme(), 'dark');
  assert.equal(store.isExplicit(), false, 'following the system is not an explicit choice');
  store.setTheme('light');
  dark = true; store.onSystemChange();
  assert.equal(store.getTheme(), 'light', 'explicit choice wins over the OS');
});

test('another tab changing the theme is picked up (storage event)', () => {
  const storage = fakeStorage();
  const a = createThemeStore({ storage, doc: fakeDoc(), matchFn: media(false) });
  let notified = 0; a.subscribe(() => notified++);
  storage.setItem(STORAGE_KEY, 'dark'); // written by "another tab"
  a.syncFromStorage();
  assert.equal(a.getTheme(), 'dark');
  assert.equal(notified, 1);
  assert.equal(a.isExplicit(), true);
});

// ---- the REAL inline pre-paint scripts of index.html, executed -------------------------------
test('pre-paint script: saved theme wins, system theme is the default, failures fall back to light', () => {
  assert.equal(runPrepaint({ storage: { 'ariana-theme': 'dark' }, dark: false }).attrs['data-theme'], 'dark');
  assert.equal(runPrepaint({ storage: { 'ariana-theme': 'light' }, dark: true }).attrs['data-theme'], 'light');
  assert.equal(runPrepaint({ storage: {}, dark: true }).attrs['data-theme'], 'dark');
  assert.equal(runPrepaint({ storage: {}, dark: false }).attrs['data-theme'], 'light');
  assert.equal(runPrepaint({ storage: { 'ariana-theme': 'neon' }, dark: true }).attrs['data-theme'], 'dark', 'tampered value ignored');
  assert.equal(runPrepaint({ storage: 'blocked', dark: true }).attrs['data-theme'], 'light');
  assert.equal(runPrepaint({ storage: {}, dark: 'throws' }).attrs['data-theme'], 'light');
});

test('pre-paint script and theme core agree (key, colours) so there is no flash after React starts', () => {
  assert.equal(runPrepaint({ storage: { [STORAGE_KEY]: 'dark' } }).themeColor, THEME_COLORS.dark);
  assert.equal(runPrepaint({ storage: { [STORAGE_KEY]: 'light' } }).themeColor, THEME_COLORS.light);
  const css = read('src/styles/tokens.css');
  assert.ok(css.includes(`--bg: ${THEME_COLORS.light}`), 'light --bg matches THEME_COLORS.light');
  assert.ok(css.includes(`--bg: ${THEME_COLORS.dark}`), 'dark --bg matches THEME_COLORS.dark');
  const html = read('index.html');
  assert.ok(html.includes(`html { background: ${THEME_COLORS.light}; }`), 'critical paint colour (light)');
  assert.ok(html.includes(`html[data-theme='dark'] { background: ${THEME_COLORS.dark}; }`), 'critical paint colour (dark)');
});

test('wiring: the toggle is in the navbar, uses a real button with a translated name, provider uses the store', () => {
  assert.match(read('src/components/layout/Navbar.jsx'), /<ThemeToggle\s*\/>/);
  const toggle = read('src/components/ui/ThemeToggle.jsx');
  assert.match(toggle, /<button type="button"/);
  assert.match(toggle, /aria-label=\{label\}/);
  assert.match(toggle, /t\('theme\.toLight'\)/);
  const provider = read('src/theme/ThemeProvider.jsx');
  assert.match(provider, /createThemeStore/);
  assert.match(provider, /useSyncExternalStore/);
  assert.match(read('src/main.jsx'), /<ThemeProvider>/);
});

// ---- language + theme synchronisation across tabs (shared storage, two independent stores) ----
import { createLocaleStore } from '../src/i18n/core.js';

function fakeLangDoc() {
  const attrs = {};
  return { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } }, querySelector: () => null, attrs };
}

test('two tabs: a language change in tab A is followed by tab B (lang + dir), and B never writes it back', () => {
  const storage = fakeStorage({ 'ariana-lang': 'en' });
  const docA = fakeLangDoc(); const docB = fakeLangDoc();
  const a = createLocaleStore({ storage, doc: docA });
  const b = createLocaleStore({ storage, doc: docB });
  let notified = 0; b.subscribe(() => notified++);
  a.setLocale('prs'); // tab A writes; the browser fires a `storage` event in tab B, which calls syncFromStorage()
  assert.equal(b.getLocale(), 'en', 'B has not synced yet');
  assert.equal(b.syncFromStorage(), true);
  assert.equal(b.getLocale(), 'prs');
  assert.deepEqual([docB.attrs.lang, docB.attrs.dir], ['prs', 'rtl']);
  assert.equal(notified, 1);
  assert.equal(b.syncFromStorage(), false, 'no change -> no notification');
  assert.equal(storage._m.get('ariana-lang'), 'prs');
  a.setLocale('pus'); b.syncFromStorage();
  assert.deepEqual([b.getLocale(), docB.attrs.dir], ['pus', 'rtl']);
  a.setLocale('en'); b.syncFromStorage();
  assert.deepEqual([b.getLocale(), docB.attrs.dir], ['en', 'ltr']);
});

test('two tabs: an invalid or removed saved language is ignored by the other tab', () => {
  const storage = fakeStorage({ 'ariana-lang': 'prs' });
  const b = createLocaleStore({ storage, doc: fakeLangDoc() });
  storage._m.set('ariana-lang', 'klingon'); assert.equal(b.syncFromStorage(), false);
  storage._m.delete('ariana-lang'); assert.equal(b.syncFromStorage(), false);
  assert.equal(b.getLocale(), 'prs', 'keeps the current language rather than guessing');
});

test('two tabs: theme and language sync independently over the same storage', () => {
  const storage = fakeStorage();
  const tA = createThemeStore({ storage, doc: fakeDoc(), matchFn: media(false) });
  const lA = createLocaleStore({ storage, doc: fakeLangDoc() });
  const tB = createThemeStore({ storage, doc: fakeDoc(), matchFn: media(false) });
  const lB = createLocaleStore({ storage, doc: fakeLangDoc() });
  tA.setTheme('dark'); lA.setLocale('pus');
  tB.syncFromStorage(); lB.syncFromStorage();
  assert.deepEqual([tB.getTheme(), lB.getLocale()], ['dark', 'pus']);
  // clearing the saved theme in A's tab makes B follow the system again
  storage._m.delete('ariana-theme'); tB.syncFromStorage();
  assert.equal(tB.getTheme(), 'light'); assert.equal(tB.isExplicit(), false);
});

test('providers listen for the storage event only for their own key (and for a full clear)', () => {
  const t = read('src/theme/ThemeProvider.jsx');
  const l = read('src/i18n/index.jsx');
  assert.match(t, /addEventListener\('storage'/); assert.match(t, /e\.key === null \|\| e\.key === STORAGE_KEY/);
  assert.match(l, /addEventListener\('storage'/); assert.match(l, /e\.key === null \|\| e\.key === STORAGE_KEY/);
  assert.match(t, /removeEventListener\('storage'/); assert.match(l, /removeEventListener\('storage'/);
});
