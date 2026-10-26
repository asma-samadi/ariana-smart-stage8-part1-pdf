/**
 * i18n core: pure JavaScript, no React, no browser globals at import time.
 * Keeping it dependency-free lets `node --test` exercise translation loading, language switching
 * and persistence without a DOM. The React layer (index.jsx) is a thin wrapper around this file.
 *
 * Locale codes follow ISO 639-3 for the two Afghan languages:
 *   en  = English (left-to-right)
 *   prs = Dari    (right-to-left)
 *   pus = Pashto  (right-to-left)
 */
import en from './en.js';
import prs from './prs.js';
import pus from './pus.js';

/** `label` is the language's own name (shown in the selector); `dir` is the text direction. */
export const LOCALES = {
  en: { label: 'English', dir: 'ltr' },
  prs: { label: 'دری', dir: 'rtl' },
  pus: { label: 'پښتو', dir: 'rtl' }
};
export const DICTIONARIES = { en, prs, pus };
export const DEFAULT_LOCALE = 'en';
export const LOCALE_CODES = Object.keys(LOCALES);

/** localStorage key. index.html reads the same key before first paint (a test keeps them in sync). */
export const STORAGE_KEY = 'ariana-lang';

export const isSupportedLocale = (code) =>
  typeof code === 'string' && Object.prototype.hasOwnProperty.call(LOCALES, code);

export const getDirection = (code) => (isSupportedLocale(code) ? LOCALES[code].dir : 'ltr');

// ---------------------------------------------------------------------------------------------
// Translation lookup
// ---------------------------------------------------------------------------------------------
function lookup(dict, path) {
  return String(path)
    .split('.')
    .reduce((node, key) => (node == null ? undefined : node[key]), dict);
}

/**
 * Returns `t(path, vars)`.
 *  - missing key in the active language falls back to English, then to the key itself;
 *  - `{name}` placeholders are filled from `vars` (unknown placeholders are left as written);
 *  - arrays/objects (FAQ items, steps, ...) are returned as-is.
 * `onMissing(path, locale)` is called when a key is absent from the ACTIVE language (dev warnings).
 */
export function createTranslator(locale, { onMissing } = {}) {
  const active = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  function t(path, vars) {
    let value = lookup(DICTIONARIES[active], path);
    if (value === undefined) {
      if (onMissing) onMissing(path, active);
      value = lookup(DICTIONARIES[DEFAULT_LOCALE], path);
    }
    if (value === undefined) return path;
    if (typeof value === 'string' && vars) {
      return value.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
    }
    return value;
  }
  t.locale = active; // lets lib/format.js localise numbers/dates without a second argument
  return t;
}

// ---------------------------------------------------------------------------------------------
// Persistence (all storage access is guarded: it can be blocked or unavailable, e.g. private mode)
// ---------------------------------------------------------------------------------------------
export function readStoredLocale(storage) {
  try {
    const value = storage?.getItem(STORAGE_KEY);
    return isSupportedLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredLocale(storage, locale) {
  if (!isSupportedLocale(locale)) return false;
  try {
    storage.setItem(STORAGE_KEY, locale);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------
// Document attributes
// ---------------------------------------------------------------------------------------------
/** Sets <html lang dir>, the page title and the meta description for `locale`. `doc` is a Document. */
export function applyDocumentLanguage(doc, locale) {
  if (!doc?.documentElement) return;
  const code = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  doc.documentElement.setAttribute('lang', code);
  doc.documentElement.setAttribute('dir', LOCALES[code].dir);
  const meta = DICTIONARIES[code].meta ?? DICTIONARIES[DEFAULT_LOCALE].meta;
  if (meta?.title) doc.title = meta.title;
  const tag = doc.querySelector?.('meta[name="description"]');
  if (tag && meta?.description) tag.setAttribute('content', meta.description);
}

// ---------------------------------------------------------------------------------------------
// Locale store: the single source of truth for "which language is active".
// ---------------------------------------------------------------------------------------------
/**
 * Creates a tiny observable store.
 *  - initial locale = saved choice, else `fallback` (English);
 *  - setLocale() validates, updates <html>, persists and notifies subscribers synchronously, so the
 *    interface re-renders immediately and a page reload restores the same language.
 */
export function createLocaleStore({ storage, doc, fallback = DEFAULT_LOCALE } = {}) {
  let current = readStoredLocale(storage) ?? (isSupportedLocale(fallback) ? fallback : DEFAULT_LOCALE);
  const listeners = new Set();
  applyDocumentLanguage(doc, current);

  return {
    getLocale: () => current,
    setLocale(next) {
      if (!isSupportedLocale(next)) return false; // ignore unknown codes; never break the UI
      if (next === current) return true;
      current = next;
      applyDocumentLanguage(doc, current);
      writeStoredLocale(storage, current);
      listeners.forEach((fn) => fn());
      return true;
    },
    /** Another tab changed the saved language: follow it (validates; never writes back). */
    syncFromStorage() {
      const next = readStoredLocale(storage);
      if (!next || next === current) return false;
      current = next;
      applyDocumentLanguage(doc, current);
      listeners.forEach((fn) => fn());
      return true;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}
