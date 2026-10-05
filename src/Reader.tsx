import { useEffect, useMemo, useRef } from 'react';
import { alignWords, computeStats, tokenize, type Lang, type WordStatus } from './lib/scoring';
import { LANGS, STRINGS } from './lib/i18n';
import type { ReadingText } from './lib/texts';
import { useRecognizer } from './lib/useRecognizer';

interface ReaderProps {
  lang: Lang;
  text: ReadingText;
  best?: number;
  onBack: () => void;
  onNext: (() => void) | null;
  onFinish: (accuracy: number) => void;
}

const STATUS_CLASS: Record<WordStatus, string> = {
  correct: 'w-ok',
  slight_mistake: 'w-close',
  incorrect: 'w-bad',
  pending: '',
};

export function Reader({ lang, text, best, onBack, onNext, onFinish }: ReaderProps) {
  const s = STRINGS[lang];
  const locale = LANGS.find((l) => l.code === lang)!.locale;
  const { transcript, listening, error, start, stop } = useRecognizer(locale);

  const words = useMemo(() => tokenize(text.text), [text.text]);
  const spoken = useMemo(() => tokenize(transcript), [transcript]);
  const statuses = useMemo(() => alignWords(words, spoken, lang), [words, spoken, lang]);
  const stats = useMemo(() => computeStats(statuses), [statuses]);
  const finished = !listening && stats.attempted > 0;

  const activeIndex = listening ? statuses.indexOf('pending') : -1;
  const activeRef = useRef<HTMLSpanElement>(null);
  const reportedRef = useRef(false);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex]);

  // Every word reached → stop automatically, like SmartyLang.
  useEffect(() => {
    if (listening && words.length > 0 && !statuses.includes('pending')) stop();
  }, [listening, statuses, words.length, stop]);

  useEffect(() => {
    if (listening) reportedRef.current = false;
    else if (finished && !reportedRef.current) {
      reportedRef.current = true;
      onFinish(stats.accuracy);
    }
  }, [listening, finished, stats.accuracy, onFinish]);

  const errorText =
    error === 'no-permission' ? s.errNoPermission
    : error === 'unavailable' ? s.errUnavailable
    : error === 'start-failed' ? s.errStart
    : null;

  return (
    <div className="screen reader">
      <header className="bar">
        <button className="ghost" onClick={() => { stop(); onBack(); }}>‹ {s.back}</button>
        {best !== undefined && <span className="chip">{s.best}: {best}%</span>}
      </header>

      <h1 className="title">{text.title}</h1>

      <div className="stats">
        <div><b>{stats.accuracy}%</b><span>{s.accuracy}</span></div>
        <div><b>{stats.coverage}%</b><span>{s.read}</span></div>
        <div className="ok"><b>{stats.correct}</b><span>{s.correct}</span></div>
        <div className="close"><b>{stats.slight}</b><span>{s.close}</span></div>
        <div className="bad"><b>{stats.wrong}</b><span>{s.wrong}</span></div>
      </div>

      <article className="passage" lang={lang}>
        {words.map((w, i) => (
          <span
            key={i}
            ref={i === activeIndex ? activeRef : undefined}
            className={`w ${STATUS_CLASS[statuses[i]]} ${i === activeIndex ? 'w-active' : ''}`}
          >
            {w}{' '}
          </span>
        ))}
      </article>

      {transcript && <p className="heard">“{transcript}”</p>}
      {errorText && <p className="error">{errorText}</p>}

      <footer className="actions">
        {listening ? (
          <>
            <p className="hint pulse">{s.listening}</p>
            <button className="mic stop" onClick={stop}>■ {s.stop}</button>
          </>
        ) : finished ? (
          <div className="row">
            <button className="secondary" onClick={start}>↻ {s.retry}</button>
            {onNext && <button className="primary" onClick={onNext}>{s.next} ›</button>}
          </div>
        ) : (
          <>
            <p className="hint">{s.tapToRead}</p>
            <button className="mic" onClick={start}>🎤 {s.start}</button>
          </>
        )}
      </footer>
    </div>
  );
}
