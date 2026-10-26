/**
 * Theme core: pure JavaScript, no React, no browser globals at import time (same approach as i18n/core.js),
 * so `node --test` can exercise theme choice, persistence and system-preference handling without a DOM.
 *
 * Rules
 *  - Two themes: 'light' and 'dark'.
 *  - An explicit choice (the toggle) is saved in localStorage under `ariana-theme` and always wins.
 *  - With no saved choice the theme follows the operating-system setting (prefers-color-scheme), live.
 *  - An invalid/tampered saved value is ignored (falls back to the system setting).
 *  - Blocked storage never breaks the toggle: it keeps working for the current session.
 * index.html contains a tiny pre-paint copy of the "initial theme" logic (a test keeps both in sync).
 */
export const THEMES = ['light', 'dark'];
export const STORAGE_KEY = 'ariana-theme';
/** Browser UI colour (mobile address bar). Matches --bg in tokens.css. */
export const THEME_COLORS = { light: '#f4f7fc', dark: '#071126' };

export const isTheme = (value) => value === 'light' || value === 'dark';

export function readStoredTheme(storage) {
  try {
    const value = storage?.getItem(STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(storage, theme) {
  if (!isTheme(theme)) return false;
  try {
    storage.setItem(STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

/** `matchFn` is window.matchMedia (or a fake). Any failure means "light". */
export function systemTheme(matchFn) {
  try {
    return matchFn?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** Sets data-theme on <html> and the browser theme colour. `doc` is a Document (or a fake). */
export function applyTheme(doc, theme) {
  if (!doc?.documentElement) return;
  const value = isTheme(theme) ? theme : 'light';
  doc.documentElement.setAttribute('data-theme', value);
  const tag = doc.querySelector?.('meta[name="theme-color"]');
  if (tag) tag.setAttribute('content', THEME_COLORS[value]);
}

/**
 * Observable theme store: the single source of truth for the active theme.
 *  - `explicit` is true once the person has chosen a theme (saved), false while following the system.
 *  - setTheme()/toggleTheme() validate, update <html>, persist and notify synchronously.
 *  - syncFromStorage() re-reads storage (another tab changed the theme).
 *  - followSystem(mediaQueryList) re-evaluates the system theme when it changes, but only while no
 *    explicit choice exists.
 */
export function createThemeStore({ storage, doc, matchFn } = {}) {
  let saved = readStoredTheme(storage);
  let current = saved ?? systemTheme(matchFn);
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn());
  applyTheme(doc, current);

  const set = (next, { persist }) => {
    if (next === current && (!persist || saved === next)) return true;
    current = next;
    if (persist) {
      saved = next;
      writeStoredTheme(storage, next);
    }
    applyTheme(doc, current);
    notify();
    return true;
  };

  return {
    getTheme: () => current,
    isExplicit: () => saved !== null,
    setTheme(next) {
      if (!isTheme(next)) return false; // ignore unknown values; never break the UI
      return set(next, { persist: true });
    },
    toggleTheme() {
      return set(current === 'dark' ? 'light' : 'dark', { persist: true });
    },
    syncFromStorage() {
      const next = readStoredTheme(storage);
      saved = next;
      const target = next ?? systemTheme(matchFn);
      if (target !== current) set(target, { persist: false });
    },
    onSystemChange() {
      if (saved !== null) return; // an explicit choice always wins
      const target = systemTheme(matchFn);
      if (target !== current) set(target, { persist: false });
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}
