import { useCallback, useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import type { Lang } from './lib/scoring';
import { LANGS, LEVELS, STRINGS, type Level } from './lib/i18n';
import { loadTexts, readBest, saveBest, type LevelTexts } from './lib/texts';
import { Reader } from './Reader';

const LANG_KEY = 'smartyreader.lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'uz' || saved === 'ru' || saved === 'en') return saved;
  } catch { /* ignore */ }
  return 'uz';
}

export default function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [level, setLevel] = useState<Level>('Beginner');
  const [texts, setTexts] = useState<LevelTexts | null>(null);
  const [failed, setFailed] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [best, setBest] = useState<Record<string, number>>(readBest);
  const s = STRINGS[lang];

  useEffect(() => {
    let alive = true;
    setTexts(null);
    setFailed(false);
    loadTexts(lang)
      .then((t) => alive && setTexts(t))
      .catch(() => alive && setFailed(true));
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
    return () => { alive = false; };
  }, [lang]);

  // Android hardware back: close the reader instead of exiting the app.
  useEffect(() => {
    const sub = CapApp.addListener('backButton', () => {
      if (openIndex !== null) setOpenIndex(null);
      else CapApp.exitApp();
    });
    return () => { sub.then((h) => h.remove()); };
  }, [openIndex]);

  const list = texts?.[level] ?? [];
  const keyFor = (id: string) => `${lang}:${level}:${id}`;

  const handleFinish = useCallback(
    (accuracy: number) => {
      if (openIndex === null) return;
      const item = list[openIndex];
      if (item) setBest(saveBest(`${lang}:${level}:${item.id}`, accuracy));
    },
    [openIndex, list, lang, level],
  );

  if (openIndex !== null && list[openIndex]) {
    const item = list[openIndex];
    return (
      <Reader
        key={keyFor(item.id)}
        lang={lang}
        text={item}
        best={best[keyFor(item.id)]}
        onBack={() => setOpenIndex(null)}
        onNext={openIndex + 1 < list.length ? () => setOpenIndex(openIndex + 1) : null}
        onFinish={handleFinish}
      />
    );
  }

  return (
    <div className="screen home">
      <header className="brand">
        <span className="logo">S</span>
        <div>
          <h1>SmartyLang Reader</h1>
          <p>{s.chooseLang}</p>
        </div>
      </header>

      <nav className="langs">
        {LANGS.map((l) => (
          <button
            key={l.code}
            className={l.code === lang ? 'lang on' : 'lang'}
            onClick={() => setLang(l.code)}
          >
            <b>{l.flag}</b>
            <span>{l.label}</span>
          </button>
        ))}
      </nav>

      <nav className="levels">
        {LEVELS.map((lv) => (
          <button key={lv} className={lv === level ? 'level on' : 'level'} onClick={() => setLevel(lv)}>
            {s.levels[lv]}
          </button>
        ))}
      </nav>

      {failed && <p className="error">Error loading texts.</p>}
      {!texts && !failed && <p className="hint">{s.loading}</p>}

      <ol className="list">
        {list.map((t, i) => {
          const b = best[keyFor(t.id)];
          return (
            <li key={t.id}>
              <button onClick={() => setOpenIndex(i)}>
                <span className="num">{i + 1}</span>
                <span className="name">{t.title}</span>
                {b !== undefined && (
                  <span className={b >= 80 ? 'score good' : 'score'}>{b}%</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
