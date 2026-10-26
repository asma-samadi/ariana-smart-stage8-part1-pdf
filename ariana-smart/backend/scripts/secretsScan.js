#!/usr/bin/env node
/**
 * Secrets-hygiene scan. Detects accidentally committed credentials / private keys.
 * Usage:  node scripts/secretsScan.js [rootDir]      (exit code 1 when anything is found)
 * Findings print the FILE, LINE and RULE only, never the secret itself.
 * This is a pattern scanner, not a guarantee: it cannot find every possible secret.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);
const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|pdf|xlsx|zip|woff2?|ttf)$/i;
const MAX_BYTES = 2_000_000;

// Forbidden FILE names (real secret files must never be in the repo / ZIP). ".env.example" is allowed.
const FORBIDDEN_FILES = [
  [/^\.env$/i, 'real .env file'],
  [/^\.env\.(?!example$).+/i, 'real .env.* file'],
  [/\.(pem|key|p12|pfx)$/i, 'private key / certificate file'],
  [/^(service-account|credentials?)[^/]*\.json$/i, 'credentials JSON file']
];

const jwtRole = (token) => {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).role; } catch { return null; }
};

// Content rules. Each returns true when the line is a finding.
const RULES = [
  ['private key block', (l) => /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(l)],
  ['google service-account JSON fields', (l) => /"private_key"\s*:\s*"-----/.test(l) || (/"type"\s*:\s*"service_account"/.test(l))],
  ['Supabase service-role JWT', (l) => (l.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) || []).some((t) => jwtRole(t) === 'service_role')],
  ['Supabase secret key (sb_secret_)', (l) => /sb_secret_[A-Za-z0-9_-]{16,}/.test(l)],
  ['Google API key', (l) => /AIza[0-9A-Za-z_-]{35}/.test(l)],
  ['GitHub token', (l) => /\bgh[pousr]_[A-Za-z0-9]{36,}\b/.test(l)],
  ['AWS access key id', (l) => /\bAKIA[0-9A-Z]{16}\b/.test(l)],
  ['API secret key (sk-...)', (l) => /\bsk-(ant-)?[A-Za-z0-9_-]{32,}\b/.test(l)],
  // A long base64 blob assigned to the service-account variable (the .env.example must stay empty).
  ['filled GOOGLE_SERVICE_ACCOUNT_JSON_BASE64', (l) => /GOOGLE_SERVICE_ACCOUNT_JSON_BASE64\s*=\s*['"]?[A-Za-z0-9+/=]{80,}/.test(l)],
  ['filled SUPABASE_SERVICE_ROLE_KEY', (l) => /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]?(?!YOUR_)[A-Za-z0-9._-]{30,}/.test(l)]
];

// Frontend code is public: it must not even REFER to backend-only secret names.
const FRONTEND_FORBIDDEN = /SERVICE_ROLE_KEY|GOOGLE_SERVICE_ACCOUNT|GOOGLE_SHEETS_ID|AI_API_KEY/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p); else yield p;
  }
}

export function scanText(text, file = '(text)') {
  const out = [];
  text.split('\n').forEach((line, i) => {
    for (const [rule, test] of RULES) if (test(line)) out.push({ file, line: i + 1, rule });
  });
  return out;
}

export function scanDir(root) {
  const findings = [];
  for (const p of walk(root)) {
    const rel = relative(root, p).split('\\').join('/');
    const base = basename(p);
    for (const [re, rule] of FORBIDDEN_FILES) if (re.test(base)) findings.push({ file: rel, line: 0, rule });
    if (BINARY_EXT.test(base) || statSync(p).size > MAX_BYTES) continue;
    let text;
    try { text = readFileSync(p, 'utf8'); } catch { continue; }
    if (text.includes('\u0000')) continue;
    // This scanner and its test build their fixtures at runtime, so they contain no literal secrets and need no exemption.
    findings.push(...scanText(text, rel));
    if (/^(frontend\/)?(src|public)\//.test(rel) || rel.startsWith('frontend/src/') || rel.startsWith('frontend/public/')) {
      text.split('\n').forEach((l, i) => { if (FRONTEND_FORBIDDEN.test(l) && !/^frontend\/src\/lib\/keySafety\.js$/.test(rel)) findings.push({ file: rel, line: i + 1, rule: 'backend-only secret name in frontend code' }); });
    }
  }
  return findings;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] || join(fileURLToPath(import.meta.url), '..', '..', '..'));
  const f = scanDir(root);
  if (f.length) {
    console.error(`SECRETS SCAN FAILED: ${f.length} finding(s)`);
    for (const x of f) console.error(`  ${x.file}${x.line ? ':' + x.line : ''}  ${x.rule}`);
    process.exit(1);
  }
  console.log(`Secrets scan passed (${root}): no credentials, private keys or secret files found.`);
}
