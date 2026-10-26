import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
test('shared rule files are identical in frontend and backend', () => {
  assert.equal(read('../src/lib/applicationRules.js'), read('../../frontend/src/lib/applicationRules.js'));
  assert.equal(read('../src/lib/keySafety.js'), read('../../frontend/src/lib/keySafety.js'));
  assert.equal(read('../src/lib/documentRules.js'), read('../../frontend/src/lib/documentRules.js'));
});
