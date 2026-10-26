/**
 * Display formatting per interface language (en / prs / pus). Pure JavaScript, no React.
 *
 * DISPLAY ONLY. Nothing here changes stored values: dates stay ISO strings in the database and API,
 * ticket data/route data are untouched, and identifiers (application reference, route code, IATA code,
 * e-mail address, file name) are never converted; they stay in Latin characters and are shown in an
 * LTR island by the <Ltr> component.
 *
 * Choices (all deliberate, all reviewable):
 *  - Calendar: always Gregorian (`-u-ca-gregory`). Browsers would otherwise show Dari/Pashto dates in the
 *    Solar Hijri calendar, which would not match the Gregorian date pickers and stored travel dates.
 *  - Digits: Dari and Pashto use the Persian/Extended Arabic-Indic digits (۰۱۲۳۴۵۶۷۸۹) that Intl picks for
 *    fa-AF and ps-AF; English keeps Latin digits.
 *  - Locale data is not guaranteed: some browser builds ship no Pashto (`ps`) data at all (the Chromium used
 *    to test this project is one). Pashto therefore falls back to Persian (`fa-AF`), which uses the same
 *    digits and a very similar Gregorian month vocabulary, and only then to English.
 */
export const CANDIDATES = {
  en: ['en-u-ca-gregory'],
  prs: ['fa-AF-u-ca-gregory', 'fa-u-ca-gregory'],
  pus: ['ps-AF-u-ca-gregory', 'ps-u-ca-gregory', 'fa-AF-u-ca-gregory', 'fa-u-ca-gregory']
};
export const FALLBACK = 'en-u-ca-gregory';

/** First candidate for which `isSupported(tag)` is true, else the English fallback. Pure; unit-tested. */
export function pickTag(candidates, isSupported) {
  try {
    return candidates.find((c) => isSupported(c)) ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}
const supported = (tag) => Intl.NumberFormat.supportedLocalesOf([tag]).length > 0 && Intl.DateTimeFormat.supportedLocalesOf([tag]).length > 0;

const tagCache = new Map();
/** The Intl locale tag to use for an interface language code. */
export function intlTag(locale) {
  if (!tagCache.has(locale)) tagCache.set(locale, pickTag(CANDIDATES[locale] ?? CANDIDATES.en, supported));
  return tagCache.get(locale);
}

const fmtCache = new Map();
function formatter(Kind, locale, options) {
  const key = `${Kind.name}|${locale}|${JSON.stringify(options)}`;
  let f = fmtCache.get(key);
  if (!f) {
    f = new Kind(intlTag(locale), options);
    fmtCache.set(key, f);
  }
  return f;
}

/** Locale of a translator made by createTranslator (it carries `.locale`); English when unknown. */
const localeOf = (t, locale) => locale ?? t?.locale ?? 'en';

/** Number with the language's digits and separators. Non-numbers are returned as plain strings. */
export function formatNumber(value, locale = 'en', options) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return String(value ?? '');
  return formatter(Intl.NumberFormat, locale, options).format(n);
}

/** A calendar year such as 2026 without a thousands separator. */
export const formatYear = (year, locale = 'en') => formatNumber(year, locale, { useGrouping: false });

/**
 * Date for display. Accepts 'YYYY-MM-DD', an ISO timestamp (only its date part is used, exactly like the
 * old `.slice(0, 10)`), or a Date. Formatted in UTC so a stored date never shifts by a day with the
 * viewer's time zone. Anything unparseable is returned unchanged rather than hidden.
 */
export function formatDate(value, locale = 'en', dateStyle = 'medium') {
  let y; let m; let d;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    y = value.getUTCFullYear(); m = value.getUTCMonth() + 1; d = value.getUTCDate();
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
    if (!match) return String(value ?? '');
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return String(value);
  return formatter(Intl.DateTimeFormat, locale, { dateStyle, timeZone: 'UTC' }).format(date);
}

/** Formats a duration in minutes with the active language's template (routes.durationFmt, e.g. '{h}h {m}m'). */
export function formatDuration(totalMinutes, t, locale) {
  const code = localeOf(t, locale);
  const h = formatNumber(Math.floor(totalMinutes / 60), code);
  const m = formatNumber(totalMinutes % 60, code, { minimumIntegerDigits: 2 });
  return t('routes.durationFmt', { h, m });
}

/** File size: MB with one decimal from 1 MB up, otherwise whole KB (minimum 1). Units come from the dictionary. */
export function formatFileSize(bytes, t, locale) {
  const code = localeOf(t, locale);
  if (bytes >= 1048576) {
    return `${formatNumber(bytes / 1048576, code, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${t('documents.units.mb')}`;
  }
  return `${formatNumber(Math.max(1, Math.round(bytes / 1024)), code)} ${t('documents.units.kb')}`;
}
