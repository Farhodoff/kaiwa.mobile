import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addLearnedWord,
  parseLearnedWords,
  serializeLearnedWords,
  wordKey,
} from '../src/lib/learned-words.ts';

test('wordKey normalizes whitespace so the same headword is counted once', () => {
  assert.equal(wordKey('  こんにちは '), 'こんにちは');
  assert.equal(wordKey('お は よ う'), 'おはよう');
});

test('addLearnedWord is idempotent', () => {
  const first = addLearnedWord([], 'こんにちは');
  assert.deepEqual(first, { keys: ['こんにちは'], added: true });

  const second = addLearnedWord(first.keys, 'こんにちは');
  assert.deepEqual(second, { keys: ['こんにちは'], added: false });
});

test('addLearnedWord ignores empty keys', () => {
  const result = addLearnedWord(['a'], '   ');
  assert.equal(result.added, false);
  assert.deepEqual(result.keys, ['a']);
});

test('serialized ledgers round-trip through storage', () => {
  const raw = serializeLearnedWords(['家', '水']);
  assert.deepEqual(parseLearnedWords(raw), ['家', '水']);
});

test('corrupt or legacy storage never throws', () => {
  assert.deepEqual(parseLearnedWords(null), []);
  assert.deepEqual(parseLearnedWords('{broken'), []);
  assert.deepEqual(parseLearnedWords('{"version":1}'), []);
  // Plain arrays from a previous format stay readable.
  assert.deepEqual(parseLearnedWords('["家"]'), ['家']);
  assert.deepEqual(parseLearnedWords('["家", 5, null]'), ['家']);
});
