import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

/**
 * Continuous read-aloud recognizer.
 *
 * Android's SpeechRecognizer stops after each pause, so we keep a "committed"
 * transcript and restart listening until the user presses Stop. Every partial
 * result is published as committed + current utterance, so the passage colors
 * update live while the student reads.
 */

const RESTART_DELAY_MS = 600;
const WATCHDOG_MS = 1500;

export type RecognizerError = 'no-permission' | 'unavailable' | 'start-failed';

export function useRecognizer(locale: string) {
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<RecognizerError | null>(null);

  const activeRef = useRef(false);
  const committedRef = useRef('');
  const currentRef = useRef('');
  const restartTimer = useRef<number | null>(null);
  const watchdog = useRef<number | null>(null);
  const handles = useRef<PluginListenerHandle[]>([]);
  const webRec = useRef<any>(null);
  const isNative = Capacitor.isNativePlatform();

  const publish = useCallback(() => {
    setTranscript(`${committedRef.current} ${currentRef.current}`.trim());
  }, []);

  const commitCurrent = useCallback(() => {
    if (currentRef.current) {
      committedRef.current = `${committedRef.current} ${currentRef.current}`.trim();
      currentRef.current = '';
    }
    publish();
  }, [publish]);

  const clearTimers = () => {
    if (restartTimer.current) window.clearTimeout(restartTimer.current);
    if (watchdog.current) window.clearInterval(watchdog.current);
    restartTimer.current = null;
    watchdog.current = null;
  };

  const startNativeSession = useCallback(async () => {
    if (!activeRef.current) return;
    try {
      await SpeechRecognition.start({
        language: locale,
        maxResults: 1,
        partialResults: true,
        popup: false,
      });
    } catch {
      // "No match" / timeout errors end a session; the watchdog restarts it.
    }
  }, [locale]);

  const scheduleRestart = useCallback(() => {
    if (!activeRef.current || restartTimer.current) return;
    restartTimer.current = window.setTimeout(async () => {
      restartTimer.current = null;
      commitCurrent();
      await startNativeSession();
    }, RESTART_DELAY_MS);
  }, [commitCurrent, startNativeSession]);

  const startNative = useCallback(async () => {
    const perm = await SpeechRecognition.checkPermissions();
    if (perm.speechRecognition !== 'granted') {
      const req = await SpeechRecognition.requestPermissions();
      if (req.speechRecognition !== 'granted') {
        setError('no-permission');
        return false;
      }
    }
    const { available } = await SpeechRecognition.available();
    if (!available) {
      setError('unavailable');
      return false;
    }
    await SpeechRecognition.removeAllListeners();
    handles.current = [
      await SpeechRecognition.addListener('partialResults', (data) => {
        const text = data.matches?.[0];
        if (text) {
          currentRef.current = text;
          publish();
        }
      }),
      await SpeechRecognition.addListener('listeningState', (data) => {
        if (data.status === 'stopped') scheduleRestart();
      }),
    ];
    watchdog.current = window.setInterval(async () => {
      if (!activeRef.current) return;
      try {
        const { listening: on } = await SpeechRecognition.isListening();
        if (!on) scheduleRestart();
      } catch {
        scheduleRestart();
      }
    }, WATCHDOG_MS);
    await startNativeSession();
    return true;
  }, [publish, scheduleRestart, startNativeSession]);

  /** Browser fallback (Chrome desktop) so the app can be tried without a phone. */
  const startWeb = useCallback(() => {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) {
      setError('unavailable');
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
        if (res.isFinal) {
          committedRef.current = `${committedRef.current} ${res[0].transcript}`.trim();
        } else {
          interim += ` ${res[0].transcript}`;
        }
      }
      currentRef.current = interim.trim();
      publish();
    };
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed') setError('no-permission');
    };
    rec.onend = () => {
      if (activeRef.current) {
        commitCurrent();
        try { rec.start(); } catch { /* already started */ }
      }
    };
    webRec.current = rec;
    rec.start();
    return true;
  }, [locale, publish, commitCurrent]);

  const start = useCallback(async () => {
    setError(null);
    committedRef.current = '';
    currentRef.current = '';
    setTranscript('');
    activeRef.current = true;
    let ok = false;
    try {
      ok = isNative ? await startNative() : startWeb();
    } catch {
      setError('start-failed');
    }
    activeRef.current = ok;
    setListening(ok);
  }, [isNative, startNative, startWeb]);

  const stop = useCallback(async () => {
    activeRef.current = false;
    clearTimers();
    setListening(false);
    if (isNative) {
      try { await SpeechRecognition.stop(); } catch { /* not listening */ }
      // Final result for the last utterance can arrive just after stop().
      await new Promise((r) => setTimeout(r, 400));
      handles.current.forEach((h) => h.remove());
      handles.current = [];
    } else if (webRec.current) {
      try { webRec.current.stop(); } catch { /* already stopped */ }
      webRec.current = null;
    }
    commitCurrent();
  }, [isNative, commitCurrent]);

  useEffect(() => () => {
    activeRef.current = false;
    clearTimers();
    if (isNative) SpeechRecognition.stop().catch(() => undefined);
    else webRec.current?.abort?.();
  }, [isNative]);

  return { transcript, listening, error, start, stop };
}
