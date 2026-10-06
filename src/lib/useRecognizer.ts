import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

/**
 * Continuous read-aloud recognizer.
 *
 * On Android it uses the app's own ReadAloud native plugin
 * (android/.../ReadAloudPlugin.java), which restarts the system recognizer after
 * every pause and reports every state/error. In a desktop browser it falls back
 * to webkitSpeechRecognition so the UI can be tried without a phone.
 */

interface ReadAloudPlugin {
  status(): Promise<{ available: boolean; permission: boolean }>;
  start(opts: { language: string }): Promise<void>;
  stop(): Promise<void>;
  addListener(event: 'partial' | 'final', cb: (d: { text: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'state', cb: (d: { state: RecognizerState }) => void): Promise<PluginListenerHandle>;
  addListener(
    event: 'error',
    cb: (d: { code: number; message: string; fatal: boolean }) => void,
  ): Promise<PluginListenerHandle>;
}

const ReadAloud = registerPlugin<ReadAloudPlugin>('ReadAloud');

export type RecognizerState = 'idle' | 'listening' | 'ready' | 'speech' | 'processing' | 'stopped';
export type RecognizerError =
  | 'no-permission'
  | 'unavailable'
  | 'start-failed'
  | 'network'
  | 'language'
  | 'no-speech'
  | 'other';

export interface RecognizerProblem {
  kind: RecognizerError;
  /** Raw Android error name/code, shown small for troubleshooting. */
  detail?: string;
}

function classify(code: number, message: string): RecognizerError {
  if (code === 9 || message === 'permission') return 'no-permission';
  if (code === 2 || code === 1 || code === 11 || code === 4) return 'network';
  if (code === 12 || code === 13) return 'language';
  if (code === 6 || code === 7) return 'no-speech';
  return 'other';
}

export function useRecognizer(locale: string) {
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [state, setState] = useState<RecognizerState>('idle');
  const [error, setError] = useState<RecognizerProblem | null>(null);

  const committedRef = useRef('');
  const currentRef = useRef('');
  const handles = useRef<PluginListenerHandle[]>([]);
  const webRec = useRef<any>(null);
  const activeRef = useRef(false);
  const isNative = Capacitor.isNativePlatform();

  const publish = useCallback(() => {
    setTranscript(`${committedRef.current} ${currentRef.current}`.trim());
  }, []);

  const commit = useCallback((text: string) => {
    if (text) committedRef.current = `${committedRef.current} ${text}`.trim();
    currentRef.current = '';
    publish();
  }, [publish]);

  const removeHandles = () => {
    handles.current.forEach((h) => h.remove());
    handles.current = [];
  };

  const startNative = useCallback(async () => {
    removeHandles();
    handles.current = [
      await ReadAloud.addListener('partial', ({ text }) => {
        currentRef.current = text;
        setError(null);
        publish();
      }),
      await ReadAloud.addListener('final', ({ text }) => commit(text || currentRef.current)),
      await ReadAloud.addListener('state', ({ state: st }) => {
        setState(st);
        if (st === 'stopped') {
          commit(currentRef.current);
          activeRef.current = false;
          setListening(false);
        }
      }),
      await ReadAloud.addListener('error', ({ code, message, fatal }) => {
        const kind = classify(code, message);
        // Soft "heard nothing" errors are normal between sentences; only show fatal ones.
        if (fatal) setError({ kind, detail: `${message} (${code})` });
      }),
    ];
    try {
      await ReadAloud.start({ language: locale });
      return true;
    } catch (e: any) {
      const code = e?.code;
      setError({
        kind: code === 'no-permission' ? 'no-permission' : code === 'unavailable' ? 'unavailable' : 'start-failed',
        detail: e?.message,
      });
      removeHandles();
      return false;
    }
  }, [locale, publish, commit]);

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
        if (res.isFinal) committedRef.current = `${committedRef.current} ${res[0].transcript}`.trim();
        else interim += ` ${res[0].transcript}`;
      }
      currentRef.current = interim.trim();
      publish();
    };
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed') setError({ kind: 'no-permission' });
      else if (e.error === 'network') setError({ kind: 'network' });
    };
    rec.onend = () => {
      if (activeRef.current) {
        commit(currentRef.current);
        try { rec.start(); } catch { /* already started */ }
      }
    };
    webRec.current = rec;
    rec.start();
    setState('listening');
    return true;
  }, [locale, publish, commit]);

  const start = useCallback(async () => {
    setError(null);
    committedRef.current = '';
    currentRef.current = '';
    setTranscript('');
    activeRef.current = true;
    const ok = isNative ? await startNative() : startWeb();
    activeRef.current = ok;
    setListening(ok);
    if (!ok) setState('idle');
  }, [isNative, startNative, startWeb]);

  const stop = useCallback(async () => {
    activeRef.current = false;
    setListening(false);
    if (isNative) {
      try { await ReadAloud.stop(); } catch { /* not running */ }
      // The last utterance's final result arrives shortly after stop().
      window.setTimeout(() => {
        commit(currentRef.current);
        removeHandles();
        setState('idle');
      }, 1200);
    } else {
      try { webRec.current?.stop(); } catch { /* already stopped */ }
      webRec.current = null;
      commit(currentRef.current);
      setState('idle');
    }
  }, [isNative, commit]);

  useEffect(() => () => {
    activeRef.current = false;
    if (isNative) {
      ReadAloud.stop().catch(() => undefined);
      removeHandles();
    } else {
      webRec.current?.abort?.();
    }
  }, [isNative]);

  return { transcript, listening, state, error, start, stop };
}
