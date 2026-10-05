/**
 * Read-aloud scoring — ported from SmartyLang (src/lib/reading-logic.ts +
 * src/lib/pronunciationProfile.ts), trimmed to the three languages this app ships.
 */

export type Lang = 'uz' | 'ru' | 'en';
export type WordStatus = 'correct' | 'incorrect' | 'slight_mistake' | 'pending';
type MatchMode = 'exact' | 'slight' | 'none';

/** Uzbek Latin apostrophes (oʻ, gʻ, tutuq belgisi) come back from ASR in many forms. */
const UZ_APOSTROPHES = /[ʻʼ'’‘`´]/gu;

export function normalizeForMatch(token: string, lang: Lang): string {
  let t = (token || '').normalize('NFC').toLowerCase();
  if (lang === 'uz') t = t.replace(UZ_APOSTROPHES, '');
  if (lang === 'ru') t = t.replace(/ё/gu, 'е');
  return t.replace(/[^\p{L}\p{N}'’-]/gu, '');
}

export function tokenize(text: string): string[] {
  return (text || '').trim().split(/\s+/u).filter(Boolean);
}

/** English-only ASR alias map (homophones / numbers), from SmartyLang. */
const ENGLISH_ALIAS_MAP: Record<string, string[]> = {
  twenty: ['20'],
  ten: ['10'],
  two: ['2', 'to', 'too'],
  five: ['5'],
  four: ['4', 'for'],
  three: ['3'],
  one: ['1', 'won'],
  twelve: ['12'],
  nine: ['9'],
  six: ['6'],
  seven: ['7'],
  eight: ['8'],
};

function englishAliasMatch(src: string, said: string): boolean {
  return Boolean(ENGLISH_ALIAS_MAP[src]?.includes(said) || ENGLISH_ALIAS_MAP[said]?.includes(src));
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a || !b) return Math.max(a.length, b.length);
  let prev = Array.from({ length: a.length + 1 }, (_, j) => j);
  for (let i = 1; i <= b.length; i++) {
    const row = [i];
    for (let j = 1; j <= a.length; j++) {
      row[j] = b[i - 1] === a[j - 1]
        ? prev[j - 1]
        : Math.min(prev[j - 1] + 1, row[j - 1] + 1, prev[j] + 1);
    }
    prev = row;
  }
  return prev[a.length];
}

function getMatchType(src: string, said: string, lang: Lang): MatchMode {
  if (src === said) return 'exact';
  if (!src || !said) return 'none';
  if (lang === 'en' && englishAliasMatch(src, said)) return 'exact';
  if (src.length >= 6 && levenshtein(src, said) <= 2) return 'slight';
  if (src.length >= 4 && levenshtein(src, said) <= 1) return 'slight';
  return 'none';
}

const isMatch = (src: string, said: string, lang: Lang) => getMatchType(src, said, lang) !== 'none';

/**
 * Align spoken words against the passage. Words the reader has not reached yet
 * stay 'pending'; skipped or misread words become 'incorrect'; near misses
 * become 'slight_mistake'. Same algorithm as SmartyLang's alignWords.
 */
export function alignWords(sourceWords: string[], spokenWords: string[], lang: Lang): WordStatus[] {
  const status: WordStatus[] = new Array(sourceWords.length).fill('pending');
  const MAX_SOURCE_LEAD = 6;
  const trans = spokenWords.slice(0, sourceWords.length + 50);
  const clean = (w: string) => normalizeForMatch(w, lang);
  let s = 0;
  let t = 0;

  while (s < sourceWords.length && t < trans.length) {
    const src = clean(sourceWords[s]);
    const said = clean(trans[t]);

    if (!src) { status[s++] = 'correct'; continue; }
    if (!said) { t++; continue; }

    // ASR sometimes splits one word into several ("basket ball") — try joining.
    let combined = said;
    let used = 1;
    let found = false;
    for (let i = 1; i <= 4 && t + i < trans.length; i++) {
      if (isMatch(src, combined, lang)) { found = true; break; }
      combined += clean(trans[t + i]);
      used++;
    }
    if (!found && isMatch(src, combined, lang)) found = true;

    if (found) {
      status[s++] = getMatchType(src, combined, lang) === 'slight' ? 'slight_mistake' : 'correct';
      t += used;
      continue;
    }

    // Extra spoken words (filler, repeats) — skip ahead in the transcript.
    let skipped = false;
    for (let i = 1; i <= 3 && t + i < trans.length; i++) {
      if (isMatch(src, clean(trans[t + i]), lang)) { t += i; skipped = true; break; }
    }
    if (skipped) {
      if (s - t > MAX_SOURCE_LEAD) return status;
      continue;
    }

    // Reader skipped passage words — mark them wrong and resync.
    let resynced = false;
    for (let i = 1; i <= 3 && s + i < sourceWords.length; i++) {
      if (isMatch(clean(sourceWords[s + i]), said, lang)) {
        for (let j = 0; j < i; j++) status[s + j] = 'incorrect';
        s += i;
        resynced = true;
        break;
      }
    }
    if (resynced) {
      if (s - t > MAX_SOURCE_LEAD) return status;
      continue;
    }

    if (s - t > MAX_SOURCE_LEAD) return status;
    status[s++] = 'incorrect';
    t++;
  }
  return status;
}

export interface ReadStats {
  attempted: number;
  correct: number;
  slight: number;
  wrong: number;
  /** Correct ÷ attempted words (pronunciation accuracy). */
  accuracy: number;
  /** Attempted ÷ all passage words (how much was read). */
  coverage: number;
}

export function computeStats(statuses: WordStatus[]): ReadStats {
  let correct = 0, slight = 0, wrong = 0;
  for (const st of statuses) {
    if (st === 'correct') correct++;
    else if (st === 'slight_mistake') slight++;
    else if (st === 'incorrect') wrong++;
  }
  const attempted = correct + slight + wrong;
  return {
    attempted,
    correct,
    slight,
    wrong,
    accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
    coverage: statuses.length ? Math.round((attempted / statuses.length) * 100) : 0,
  };
}
