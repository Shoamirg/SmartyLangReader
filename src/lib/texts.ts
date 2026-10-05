import type { Lang } from './scoring';
import type { Level } from './i18n';

export interface ReadingText {
  id: string;
  title: string;
  text: string;
}

export type LevelTexts = Record<Level, ReadingText[]>;

const cache: Partial<Record<Lang, Promise<LevelTexts>>> = {};

/** Texts ship inside the APK (public/texts/*.json) — no network needed. */
export function loadTexts(lang: Lang): Promise<LevelTexts> {
  cache[lang] ??= fetch(`./texts/${lang}.json`).then((r) => {
    if (!r.ok) throw new Error(`texts ${lang}: ${r.status}`);
    return r.json() as Promise<LevelTexts>;
  });
  cache[lang]!.catch(() => delete cache[lang]);
  return cache[lang]!;
}

const BEST_KEY = 'smartyreader.best';

export function readBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveBest(key: string, accuracy: number): Record<string, number> {
  const best = readBest();
  const next = { ...best, [key]: Math.max(best[key] ?? 0, accuracy) };
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — keep in memory only */
  }
  return next;
}
