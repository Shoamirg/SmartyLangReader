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

import { applyUtterance, emptyProgress } from '../src/lib/scoring.ts';

const words = tokenize('Every morning I wake up early. I wash my face with cold water.');

test('progress continues from where the reader stopped (never back to the start)', () => {
  let p = emptyProgress(words.length);
  p = applyUtterance(p, words, tokenize('every morning I wake up early'), 'en');
  assert.equal(p.cursor, 6);
  // Second utterance must not be matched against the beginning of the passage.
  p = applyUtterance(p, words, tokenize('I wash my face'), 'en');
  assert.equal(p.cursor, 10);
  assert.ok(p.statuses.slice(0, 10).every((s) => s === 'correct'));
});

test('noise utterance is ignored, not counted as mistakes', () => {
  const p0 = applyUtterance(emptyProgress(words.length), words, tokenize('every morning'), 'en');
  const p1 = applyUtterance(p0, words, tokenize('hmm okay'), 'en');
  assert.deepEqual(p1, p0);
});

test('locked words never change when a later utterance repeats them', () => {
  let p = applyUtterance(emptyProgress(words.length), words, tokenize('every morning I wake up early'), 'en');
  const before = p.statuses.slice(0, 6);
  p = applyUtterance(p, words, tokenize('I wash'), 'en');
  assert.deepEqual(p.statuses.slice(0, 6), before);
});
