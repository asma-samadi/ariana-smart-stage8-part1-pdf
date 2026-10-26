import test from 'node:test';
import assert from 'node:assert/strict';
import { matchIntent, normalize, MAX_QUESTION_LENGTH } from '../src/lib/assistantEngine.js';

test('normalizes Dari/Persian letter variants and zero-width characters', () => {
  assert.equal(normalize('كِتاب\u200cها'), 'کتابها');
});

test('matches common supported topics', () => {
  assert.equal(matchIntent('Can I book a real flight?'), 'booking');
  assert.equal(matchIntent('How do I apply for a ticket?'), 'apply');
  assert.equal(matchIntent('Which documents are needed?'), 'documents');
  assert.equal(matchIntent('Are the routes real?'), 'routes');
  assert.equal(matchIntent('What is the price?'), 'price');
  assert.equal(matchIntent('سلام'), 'greeting');
});

test('empty and unknown questions have safe fallbacks', () => {
  assert.equal(matchIntent(''), 'help');
  assert.equal(matchIntent('Tell me about dragons'), 'fallback');
});

test('long questions are bounded by the assistant input limit', () => {
  assert.equal(MAX_QUESTION_LENGTH, 300);
  assert.equal(matchIntent('x'.repeat(10000)), 'fallback');
});
