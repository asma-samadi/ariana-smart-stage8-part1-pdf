/** Tiny CSS helpers for tests: read design tokens per theme and compute WCAG contrast. No dependencies. */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** Returns the body of the first top-level rule whose selector (trimmed) equals `selector`. */
export function ruleBody(css, selector) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const idx = clean.search(new RegExp(`(^|\\})\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`));
  if (idx < 0) return null;
  const open = clean.indexOf('{', idx);
  let depth = 0;
  for (let i = open; i < clean.length; i++) {
    if (clean[i] === '{') depth++;
    else if (clean[i] === '}' && --depth === 0) return clean.slice(open + 1, i);
  }
  return null;
}

export const vars = (body) => Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

/** { light: {...all tokens}, dark: {...light tokens overridden by dark} } */
export function themeTokens() {
  const css = read('src/styles/tokens.css');
  const light = vars(ruleBody(css, ':root'));
  const dark = { ...light, ...vars(ruleBody(css, "[data-theme='dark']")) };
  return { light, dark };
}

const hex = (h) => {
  const v = h.replace('#', '');
  const f = v.length === 3 ? [...v].map((c) => c + c).join('') : v;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};
const lum = ([r, g, b]) => {
  const c = [r, g, b].map((x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
/** WCAG 2.x contrast ratio of two #rrggbb colours (opaque). */
export function contrast(a, b) {
  const [l1, l2] = [lum(hex(a)), lum(hex(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
