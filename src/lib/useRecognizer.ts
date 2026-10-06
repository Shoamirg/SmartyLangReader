import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

/**
 * Read-aloud recognizer.
 *
 * Android: the app's own ReadAloud plugin (android/.../ReadAloudPlugin.java),
 * which runs Vosk fully offline with uz/ru/en models bundled in the APK.
 * Desktop browser: webkitSpeechRecognition fallback so the UI can be tried.
 *
 * The hook reports the utterance currently being spoken (`partial`) and calls
 * `onUtterance` once per finished utterance; the reader advances from there.
 */

interface ReadAloudPlugin {
  start(opts: { language: string }): Promise<void>;
  stop(): Promise<void>;
  addListener(event: 'partial' | 'final', cb: (d: { text: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'state', cb: (d: { state: RecognizerState }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'error', cb: (d: { message: string }) => void): Promise<PluginListenerHandle>;
}

const ReadAloud = registerPlugin<ReadAloudPlugin>('ReadAloud');

export type RecognizerState = 'idle' | 'loading' | 'listening' | 'stopped';
export type RecognizerError = 'no-permission' | 'unavailable' | 'start-failed' | 'other';

export interface RecognizerProblem {
  kind: RecognizerError;
  detail?: string;
}

export function useRecognizer(locale: string, onUtterance: (text: string) => void) {
  const [partial, setPartial] = useState('');
  const [listening, setListening] = useState(false);
  const [state, setState] = useState<RecognizerState>('idle');
  const [error, setError] = useState<RecognizerProblem | null>(null);

  const onUtteranceRef = useRef(onUtterance);
  onUtteranceRef.current = onUtterance;
  const handles = useRef<PluginListenerHandle[]>([]);
  const webRec = useRef<any>(null);
  const activeRef = useRef(false);
  const isNative = Capacitor.isNativePlatform();

  const finishUtterance = useCallback((text: string) => {
    setPartial('');
    if (text.trim()) onUtteranceRef.current(text.trim());
  }, []);

  const removeHandles = () => {
    handles.current.forEach((h) => h.remove());
    handles.current = [];
  };

  const startNative = useCallback(async () => {
    removeHandles();
    handles.current = [
      await ReadAloud.addListener('partial', ({ text }) => setPartial(text)),
      await ReadAloud.addListener('final', ({ text }) => finishUtterance(text)),
      await ReadAloud.addListener('state', ({ state: st }) => {
        setState(st);
        if (st === 'stopped') {
          activeRef.current = false;
          setListening(false);
          setPartial('');
          removeHandles();
        }
      }),
      await ReadAloud.addListener('error', ({ message }) => setError({ kind: 'other', detail: message })),
    ];
    try {
      await ReadAloud.start({ language: locale });
      return true;
    } catch (e: any) {
      setError({ kind: e?.code === 'no-permission' ? 'no-permission' : 'start-failed', detail: e?.message });
      removeHandles();
      return false;
    }
  }, [locale, finishUtterance]);

  const startWeb = useCallback(() => {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) {
      setError({ kind: 'unavailable' });
      return false;
    }
    const rec = new Ctor();
    rec.lang = locale;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finishUtterance(res[0].transcript);
        else interim += ` ${res[0].transcript}`;
      }
      setPartial(interim.trim());
    };
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed') setError({ kind: 'no-permission' });
    };
    rec.onend = () => {
      if (activeRef.current) {
        try { rec.start(); } catch { /* already started */ }
      }
    };
    webRec.current = rec;
    rec.start();
    setState('listening');
    return true;
  }, [locale, finishUtterance]);

  const start = useCallback(async () => {
    setError(null);
    setPartial('');
    activeRef.current = true;
    setListening(true);
    const ok = isNative ? await startNative() : startWeb();
    activeRef.current = ok;
    setListening(ok);
    if (!ok) setState('idle');
  }, [isNative, startNative, startWeb]);

  const stop = useCallback(async () => {
    activeRef.current = false;
    setListening(false);
    if (isNative) {
      // Native flushes the last utterance as "final", then emits "stopped".
      try { await ReadAloud.stop(); } catch { /* not running */ }
    } else {
      try { webRec.current?.stop(); } catch { /* already stopped */ }
      webRec.current = null;
      setPartial('');
      setState('idle');
    }
  }, [isNative]);

  useEffect(() => () => {
    activeRef.current = false;
    if (isNative) ReadAloud.stop().catch(() => undefined);
    else webRec.current?.abort?.();
  }, [isNative]);

  return { partial, listening, state, error, start, stop };
}
