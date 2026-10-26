import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { LOCALES, STORAGE_KEY, createLocaleStore, createTranslator, getDirection } from './core.js';
import { formatDate, formatDuration, formatFileSize, formatNumber, formatYear } from '../lib/format.js';

/**
 * Localization provider. English (en), Dari (prs) and Pashto (pus).
 * Logic lives in ./core.js (pure, unit-tested); this file only connects it to React.
 * The choice is saved in localStorage and applied to <html lang dir> before the first render.
 */
export { LOCALES };

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null; // storage blocked: the language still works for this session
  }
}

// One store for the whole app. Created lazily so importing this module never touches the DOM.
let store = null;
const getStore = () => {
  if (!store) store = createLocaleStore({ storage: safeStorage(), doc: document });
  return store;
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const s = getStore();
  const locale = useSyncExternalStore(s.subscribe, s.getLocale, s.getLocale);

  // Keep several open tabs in step when the language is changed in another one.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === null || e.key === STORAGE_KEY) s.syncFromStorage();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [s]);

  const t = useMemo(
    () =>
      createTranslator(locale, {
        onMissing: (path, code) => {
          if (import.meta.env?.DEV) console.warn(`[i18n] missing key "${path}" for "${code}"`);
        }
      }),
    [locale]
  );

  // Display formatters bound to the active language (digits, dates, durations, file sizes). Display only.
  const format = useMemo(
    () => ({
      number: (n, options) => formatNumber(n, locale, options),
      year: (y) => formatYear(y, locale),
      date: (d, style) => formatDate(d, locale, style),
      duration: (minutes) => formatDuration(minutes, t, locale),
      fileSize: (bytes) => formatFileSize(bytes, t, locale)
    }),
    [locale, t]
  );

  const value = useMemo(
    () => ({ t, locale, dir: getDirection(locale), setLocale: s.setLocale, locales: LOCALES, format }),
    [t, locale, s, format]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
