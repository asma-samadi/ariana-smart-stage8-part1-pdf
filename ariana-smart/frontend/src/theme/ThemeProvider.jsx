import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { STORAGE_KEY, createThemeStore } from './core.js';

/**
 * Theme provider. Logic lives in ./core.js (pure, unit-tested); this file connects it to React.
 * index.html sets data-theme before first paint, so the store's first read matches what is on screen.
 */
function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null; // storage blocked: the theme still works for this session
  }
}

// One store for the whole app, created lazily so importing this module never touches the DOM.
let store = null;
const getStore = () => {
  if (!store) {
    store = createThemeStore({ storage: safeStorage(), doc: document, matchFn: (q) => window.matchMedia(q) });
  }
  return store;
};

const ThemeContext = createContext({ theme: 'light', explicit: false, setTheme: () => {}, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const s = getStore();
  const theme = useSyncExternalStore(s.subscribe, s.getTheme, s.getTheme);

  useEffect(() => {
    // Follow the operating system while the person has not chosen a theme.
    let mql = null;
    try {
      mql = window.matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener('change', s.onSystemChange);
    } catch { /* older browsers: no live system updates */ }
    // Keep several open tabs in step.
    const onStorage = (e) => {
      if (e.key === null || e.key === STORAGE_KEY) s.syncFromStorage();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      mql?.removeEventListener?.('change', s.onSystemChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [s]);

  const value = useMemo(
    () => ({ theme, explicit: s.isExplicit(), setTheme: s.setTheme, toggleTheme: s.toggleTheme }),
    [theme, s]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
