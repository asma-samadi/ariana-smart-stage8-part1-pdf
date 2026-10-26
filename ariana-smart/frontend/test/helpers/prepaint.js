/** Runs the REAL inline <script> blocks of index.html in a vm sandbox with fake browser objects. */
import vm from 'node:vm';
import { read } from './css.js';

export function inlineScripts() {
  const html = read('index.html');
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

/**
 * @param {object} o  { storage: {key: value}|'blocked', dark: boolean|'throws' }
 * @returns the fake document's recorded attributes + meta theme-color
 */
export function runPrepaint({ storage = {}, dark = false } = {}) {
  const attrs = {};
  const meta = { content: '', setAttribute(k, v) { if (k === 'content') this.content = v; } };
  const sandbox = {
    document: {
      documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: (k) => attrs[k] },
      querySelector: (sel) => (sel === 'meta[name="theme-color"]' ? meta : null)
    },
    localStorage: storage === 'blocked'
      ? { getItem() { throw new Error('SecurityError'); } }
      : { getItem: (k) => (Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null) },
    window: {
      matchMedia: () => {
        if (dark === 'throws') throw new Error('no matchMedia');
        return { matches: dark === true };
      }
    }
  };
  vm.createContext(sandbox);
  for (const code of inlineScripts()) vm.runInContext(code, sandbox);
  return { attrs, themeColor: meta.content };
}
