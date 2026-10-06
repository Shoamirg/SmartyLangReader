import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyUtterance,
  computeStats,
  emptyProgress,
  tokenize,
  type Lang,
  type WordStatus,
} from './lib/scoring';
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

const HEARD_LINES = 3;

export function Reader({ lang, text, best, onBack, onNext, onFinish }: ReaderProps) {
  const s = STRINGS[lang];
  const locale = LANGS.find((l) => l.code === lang)!.locale;
  const words = useMemo(() => tokenize(text.text), [text.text]);

  // Locked progress: once a word is marked it never goes back to unread.
  const [progress, setProgress] = useState(() => emptyProgress(words.length));
  const [heard, setHeard] = useState<string[]>([]);

  const handleUtterance = useCallback(
    (utterance: string) => {
      setProgress((p) => applyUtterance(p, words, tokenize(utterance), lang));
      setHeard((h) => [...h, utterance].slice(-HEARD_LINES));
    },
    [words, lang],
  );

  const { partial, listening, state, error, start, stop } = useRecognizer(locale, handleUtterance);

  // Live preview of the sentence being spoken, on top of the locked progress.
  const view = useMemo(
    () => applyUtterance(progress, words, tokenize(partial), lang),
    [progress, words, partial, lang],
  );
  const stats = useMemo(() => computeStats(progress.statuses), [progress]);
  const liveStats = useMemo(() => computeStats(view.statuses), [view]);
  const finished = !listening && state !== 'loading' && progress.cursor > 0;

  const activeIndex = listening && view.cursor < words.length ? view.cursor : -1;
  const activeRef = useRef<HTMLSpanElement>(null);
  const reportedRef = useRef(false);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex]);

  // Reached the last word → stop automatically.
  useEffect(() => {
    if (listening && progress.cursor >= words.length) stop();
  }, [listening, progress.cursor, words.length, stop]);

  useEffect(() => {
    if (listening) reportedRef.current = false;
    else if (finished && !reportedRef.current) {
      reportedRef.current = true;
      onFinish(stats.accuracy);
    }
  }, [listening, finished, stats.accuracy, onFinish]);

  const restart = () => {
    setProgress(emptyProgress(words.length));
    setHeard([]);
    start();
  };

  const ERROR_TEXT = {
    'no-permission': s.errNoPermission,
    unavailable: s.errUnavailable,
    'start-failed': s.errStart,
    other: s.errOther,
  } as const;
  const errorText = error ? ERROR_TEXT[error.kind] : null;
  const statusText = state === 'loading' ? s.stLoading : s.listening;
  const shown = listening ? liveStats : stats;

  return (
    <div className="screen reader">
      <header className="bar">
        <button className="ghost" onClick={() => { stop(); onBack(); }}>‹ {s.back}</button>
        {best !== undefined && <span className="chip">{s.best}: {best}%</span>}
      </header>

      <h1 className="title">{text.title}</h1>

      <div className="stats">
        <div><b>{shown.accuracy}%</b><span>{s.accuracy}</span></div>
        <div><b>{shown.coverage}%</b><span>{s.read}</span></div>
        <div className="ok"><b>{shown.correct}</b><span>{s.correct}</span></div>
        <div className="close"><b>{shown.slight}</b><span>{s.close}</span></div>
        <div className="bad"><b>{shown.wrong}</b><span>{s.wrong}</span></div>
      </div>

      <article className="passage" lang={lang}>
        {words.map((w, i) => (
          <span
            key={i}
            ref={i === activeIndex ? activeRef : undefined}
            className={`w ${STATUS_CLASS[view.statuses[i]]} ${i === activeIndex ? 'w-active' : ''}`}
          >
            {w}{' '}
          </span>
        ))}
      </article>

      {(heard.length > 0 || partial) && (
        <p className="heard">
          {[...heard, partial].filter(Boolean).join(' · ')}
        </p>
      )}
      {errorText && (
        <p className="error">
          {errorText}
          {error?.detail && <small> [{error.detail}]</small>}
        </p>
      )}

      <footer className="actions">
        {listening ? (
          <>
            <p className="hint pulse">{statusText}</p>
            <button className="mic stop" onClick={stop}>■ {s.stop}</button>
          </>
        ) : finished ? (
          <div className="row">
            {progress.cursor < words.length && (
              <button className="secondary" onClick={start}>▶ {s.resume}</button>
            )}
            <button className="secondary" onClick={restart}>↻ {s.retry}</button>
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
