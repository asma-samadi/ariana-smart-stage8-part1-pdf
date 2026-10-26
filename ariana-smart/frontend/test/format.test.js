import test from 'node:test';
import assert from 'node:assert/strict';
import { CANDIDATES, FALLBACK, formatDate, formatDuration, formatFileSize, formatNumber, formatYear, intlTag, pickTag } from '../src/lib/format.js';
import { createTranslator } from '../src/i18n/core.js';
import { sampleRoutes } from '../src/data/routes.js';
import { read } from './helpers/css.js';

const PERSIAN_DIGITS = /[\u06F0-\u06F9]/;
const LATIN_DIGITS = /[0-9]/;
const T = { en: createTranslator('en'), prs: createTranslator('prs'), pus: createTranslator('pus') };

test('the translator carries its locale so formatters follow the language automatically', () => {
  assert.equal(T.en.locale, 'en');
  assert.equal(T.prs.locale, 'prs');
  assert.equal(T.pus.locale, 'pus');
  assert.equal(createTranslator('xx').locale, 'en');
});

test('numbers: Latin digits in English, Persian digits in Dari and Pashto', () => {
  assert.equal(formatNumber(1234, 'en'), '1,234');
  assert.ok(PERSIAN_DIGITS.test(formatNumber(1234, 'prs')) && !LATIN_DIGITS.test(formatNumber(1234, 'prs')));
  assert.ok(PERSIAN_DIGITS.test(formatNumber(1234, 'pus')) && !LATIN_DIGITS.test(formatNumber(1234, 'pus')));
  assert.equal(formatNumber('7', 'prs'), '\u06F7', 'numeric strings (e.g. form values) are formatted');
  assert.equal(formatYear(2026, 'en'), '2026', 'years have no thousands separator');
  assert.equal(formatYear(2026, 'prs'), '\u06F2\u06F0\u06F2\u06F6');
});

test('numbers: non-numeric input is returned as plain text, never "NaN" or an exception', () => {
  assert.equal(formatNumber('abc', 'prs'), 'abc');
  assert.equal(formatNumber(NaN, 'en'), 'NaN'); // String(NaN): shown as-is, not hidden
  assert.equal(formatNumber(null, 'en'), '');
  assert.equal(formatNumber(undefined, 'prs'), '');
  assert.equal(formatNumber('', 'en'), '');
});

test('dates: Gregorian calendar with localized month names and digits, never the Solar Hijri year', () => {
  assert.equal(formatDate('2026-10-18', 'en'), 'Oct 18, 2026');
  for (const l of ['prs', 'pus']) {
    const out = formatDate('2026-10-18', l);
    assert.ok(out.includes('\u06F2\u06F0\u06F2\u06F6'), `${l}: Gregorian year 2026 in Persian digits (${out})`);
    assert.ok(!out.includes('\u06F1\u06F4\u06F0\u06F5'), `${l}: not the Solar Hijri year 1405 (${out})`);
    assert.ok(!LATIN_DIGITS.test(out), `${l}: no Latin digits`);
    assert.ok(/[\u0600-\u06FF]/.test(out), `${l}: Arabic-script month name`);
  }
});

test('dates: a stored date never shifts with the viewer time zone; timestamps use their date part', () => {
  const saved = process.env.TZ;
  try {
    for (const tz of ['Pacific/Kiritimati', 'Pacific/Pago_Pago', 'UTC']) {
      process.env.TZ = tz;
      assert.equal(formatDate('2026-01-01', 'en'), 'Jan 1, 2026', `TZ ${tz}`);
      assert.equal(formatDate('2026-12-31', 'en'), 'Dec 31, 2026', `TZ ${tz}`);
    }
  } finally {
    if (saved === undefined) delete process.env.TZ; else process.env.TZ = saved;
  }
  // identical to the old `.slice(0, 10)` behaviour for timestamps
  assert.equal(formatDate('2026-10-17T23:59:59.000Z', 'en'), formatDate('2026-10-17', 'en'));
  assert.equal(formatDate(new Date(Date.UTC(2026, 9, 18)), 'en'), 'Oct 18, 2026');
});

test('dates: invalid or impossible dates are shown unchanged instead of being hidden or guessed', () => {
  for (const bad of ['garbage', '2026-02-31', '2026-13-01', '', null, undefined]) {
    assert.equal(formatDate(bad, 'prs'), String(bad ?? ''));
  }
  assert.equal(formatDate(new Date('nope'), 'en'), 'Invalid Date');
});

test('durations: same hours and minutes, digits per language', () => {
  assert.equal(formatDuration(190, T.en), '3h 10m');
  assert.equal(formatDuration(60, T.en), '1h 00m');
  assert.equal(formatDuration(305, T.en), '5h 05m');
  assert.equal(formatDuration(190, T.prs), '\u06F3 \u0633\u0627\u0639\u062A \u0648 \u06F1\u06F0 \u062F\u0642\u06CC\u0642\u0647');
  assert.match(formatDuration(305, T.pus), /\u06F5.*\u06F0\u06F5/);
  // an explicit locale argument wins over the translator's
  assert.equal(formatDuration(190, T.en, 'prs'), '\u06F3h \u06F1\u06F0m');
});

test('route data is untouched by localization: minutes stay numbers, codes stay Latin', () => {
  for (const r of sampleRoutes) {
    assert.equal(typeof r.minutes, 'number');
    assert.match(r.code, /^DEMO-\d+$/);
    assert.match(r.from, /^[A-Z]{3}$/);
  }
  // spot check that formatting does not mutate its input
  const copy = JSON.stringify(sampleRoutes);
  sampleRoutes.forEach((r) => formatDuration(r.minutes, T.prs));
  assert.equal(JSON.stringify(sampleRoutes), copy);
});

test('file sizes: MB with one decimal from 1 MB, otherwise whole KB (min 1); units from the dictionary', () => {
  assert.equal(formatFileSize(2621440, T.en), '2.5 MB');
  assert.equal(formatFileSize(1048576, T.en), '1.0 MB');
  assert.equal(formatFileSize(500, T.en), '1 KB');
  assert.equal(formatFileSize(512000, T.en), '500 KB');
  const prs = formatFileSize(2621440, T.prs);
  assert.ok(prs.includes('\u06F2\u066B\u06F5') && prs.includes('\u0645\u06AF\u0627\u0628\u0627\u06CC\u062A'), prs);
  assert.ok(prs.includes(T.prs('documents.units.mb')));
  assert.ok(formatFileSize(512000, T.pus).includes(T.pus('documents.units.kb')));
});

test('locale tag selection: Pashto falls back to Persian data, then English, when a browser lacks Pashto', () => {
  const none = () => false;
  assert.equal(pickTag(CANDIDATES.pus, none), FALLBACK);
  assert.equal(pickTag(CANDIDATES.pus, (t) => t.startsWith('fa-AF')), 'fa-AF-u-ca-gregory', 'Pashto -> Persian digits, not English');
  assert.equal(pickTag(CANDIDATES.pus, (t) => t.startsWith('ps-AF')), 'ps-AF-u-ca-gregory', 'real Pashto data is preferred');
  assert.equal(pickTag(CANDIDATES.prs, (t) => t === 'fa-u-ca-gregory'), 'fa-u-ca-gregory');
  assert.equal(pickTag(CANDIDATES.prs, () => { throw new Error('boom'); }), FALLBACK);
  for (const tag of Object.values(CANDIDATES).flat()) assert.ok(tag.includes('-u-ca-gregory'), `${tag} forces the Gregorian calendar`);
  for (const l of ['en', 'prs', 'pus', 'unknown']) assert.ok(intlTag(l).includes('-u-ca-gregory'));
});

test('identifiers are never converted: references, codes and e-mails go through <Ltr>, not number formatting', () => {
  const dash = read('src/pages/Dashboard.jsx');
  assert.match(dash, /<Ltr>\{r\.reference\}<\/Ltr>/);
  assert.match(dash, /<Ltr>\{user\?\.email\}<\/Ltr>/);
  assert.match(dash, /<RoutePair from=\{r\.origin\} to=\{r\.destination\}/);
  assert.doesNotMatch(dash, /format\.number\(r\.reference/);
  assert.match(read('src/pages/Apply.jsx'), /<Ltr>\{a\.reference\}<\/Ltr>/);
  assert.match(read('src/components/ui/RouteCard.jsx'), /<Ltr className="route-code">/);
  assert.match(read('src/pages/Travel.jsx'), /<Ltr>\{r\.code\}<\/Ltr>/);
});

test('display formatting is used where users see numbers and dates; ISO substrings are gone from the UI', () => {
  const dash = read('src/pages/Dashboard.jsx');
  assert.match(dash, /format\.date\(r\.depart_date\)/);
  assert.match(dash, /format\.date\(r\.created_at\)/);
  assert.match(dash, /format\.number\(r\.passengers\)/);
  assert.doesNotMatch(dash, /\.slice\(0, 10\)/);
  const docs = read('src/pages/Documents.jsx');
  assert.match(docs, /format\.fileSize\(d\.size_bytes\)/);
  assert.match(docs, /format\.date\(d\.created_at\)/);
  assert.doesNotMatch(docs, /toFixed\(1\)|\.slice\(0, 10\)/);
  assert.match(read('src/components/layout/Footer.jsx'), /format\.year\(/);
  assert.match(read('src/pages/Home.jsx'), /format\.number\(filtered\.length\)/);
});

test('backend request payloads still carry raw values (localization is display only)', () => {
  const apply = read('src/pages/Apply.jsx');
  assert.match(apply, /const payload = \{ \.\.\.form, passengers: Number\(form\.passengers\)/);
  assert.doesNotMatch(apply, /format\.(date|number)\(form\./);
});
