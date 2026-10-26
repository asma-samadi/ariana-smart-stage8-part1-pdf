import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DICTIONARIES } from '../src/i18n/core.js';
import { ROOT } from './helpers/css.js';

const doc = readFileSync(join(ROOT, '..', 'docs', 'TRANSLATION_REVIEW.md'), 'utf8');
const lookup = (dict, path) => path.split('.').reduce((n, k) => (n == null ? undefined : n[k]), dict);
const listed = [...doc.matchAll(/^\| `([\w.]+)` \|/gm)].map((m) => m[1]);

test('the review list says plainly that nothing has been reviewed by a native speaker', () => {
  assert.match(doc, /\*\*Status: NOT reviewed\.\*\*/);
  assert.match(doc, /native speaker/);
});

test('every key in the review list exists in English, Dari and Pashto, and the table shows the real text', () => {
  assert.ok(listed.length >= 30, `expected at least 30 rows, found ${listed.length}`);
  for (const key of listed) {
    for (const code of ['en', 'prs', 'pus']) assert.equal(typeof lookup(DICTIONARIES[code], key), 'string', `${code} ${key}`);
    const row = doc.split('\n').find((l) => l.startsWith(`| \`${key}\` |`));
    const cells = row.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|')).filter(Boolean);
    assert.equal(cells[1], lookup(DICTIONARIES.en, key).replace(/\n/g, ' '), `${key}: English column is out of date`);
    assert.equal(cells[2], lookup(DICTIONARIES.prs, key).replace(/\n/g, ' '), `${key}: Dari column is out of date`);
    assert.equal(cells[3], lookup(DICTIONARIES.pus, key).replace(/\n/g, ' '), `${key}: Pashto column is out of date`);
  }
});

test('all legal / privacy / consent / disclaimer keys in the dictionaries are on the review list', () => {
  const must = ['apply.consentText', 'apply.sections.consent', 'apply.fields.consent', 'apply.errors.consentRequired',
    'footer.disclaimerTitle', 'footer.disclaimer', 'about.disclaimerTitle', 'about.disclaimerText',
    'dashboard.privacyTitle', 'dashboard.privacyText', 'auth.register.privacy', 'documents.demoNotice', 'apply.demoNotice', 'demo.banner'];
  for (const k of must) assert.ok(listed.includes(k), `${k} missing from docs/TRANSLATION_REVIEW.md`);
  // any English string that mentions privacy/consent/disclaimer must be listed too (catches new keys later)
  const flat = (n, p = '', o = {}) => { if (typeof n === 'string') o[p] = n; else if (Array.isArray(n)) n.forEach((v, i) => flat(v, p ? `${p}.${i}` : `${i}`, o)); else if (n && typeof n === 'object') Object.entries(n).forEach(([k, v]) => flat(v, p ? `${p}.${k}` : k, o)); return o; };
  const sensitive = Object.entries(flat(DICTIONARIES.en)).filter(([k, v]) => /consent|disclaimer|privacy/i.test(k) || /\bconsent\b|disclaimer|\bprivacy\b/i.test(v)).map(([k]) => k);
  const missing = sensitive.filter((k) => !listed.includes(k));
  assert.deepEqual(missing, [], `sensitive keys not on the review list: ${missing.join(', ')}`);
});
