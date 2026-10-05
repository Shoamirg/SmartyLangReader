import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignWords, computeStats, tokenize } from '../src/lib/scoring.ts';

const run = (src: string, said: string, lang: 'uz' | 'ru' | 'en') =>
  computeStats(alignWords(tokenize(src), tokenize(said), lang));

test('perfect English reading scores 100%', () => {
  const st = run('My name is Ben. Nice to meet you.', 'my name is ben nice to meet you', 'en');
  assert.equal(st.accuracy, 100);
  assert.equal(st.coverage, 100);
});

test('unread words stay pending (partial reading)', () => {
  const st = run('Every morning I wake up early and wash my face with cold water.', 'every morning I wake', 'en');
  assert.equal(st.attempted, 4);
  assert.equal(st.accuracy, 100);
});

test('misread word is marked wrong', () => {
  const s = alignWords(tokenize('I like green apples'), tokenize('I like grin apples'), 'en');
  assert.deepEqual(s, ['correct', 'correct', 'incorrect', 'correct']);
});

test('Uzbek apostrophe variants match (oʻ vs o\')', () => {
  const st = run('Zoʻr. Yonima oʻtirasizmi?', "zo'r yonima o'tirasizmi", 'uz');
  assert.equal(st.accuracy, 100);
});

test('Russian ё/е and case fold', () => {
  const st = run('Ещё одно утро.', 'еще одно утро', 'ru');
  assert.equal(st.accuracy, 100);
});

test('near miss on long word is slight mistake', () => {
  const s = alignWords(tokenize('просыпаюсь'), tokenize('просыпаюс'), 'ru');
  assert.deepEqual(s, ['slight_mistake']);
});

test('skipped word is marked wrong and reading resyncs', () => {
  const s = alignWords(tokenize('I drink hot tea every day'), tokenize('I drink tea every day'), 'en');
  assert.deepEqual(s, ['correct', 'correct', 'incorrect', 'correct', 'correct', 'correct']);
});
