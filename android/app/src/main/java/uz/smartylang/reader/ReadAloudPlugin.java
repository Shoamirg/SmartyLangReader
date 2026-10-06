package uz.smartylang.reader;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

/**
 * Continuous read-aloud recognizer.
 *
 * Android's SpeechRecognizer ends after every pause. This plugin restarts it
 * natively after each final result (never cancelling a session mid-result) and
 * reports every event — partial, final, error code, state — to JS so the UI
 * can show what is happening instead of failing silently.
 */
@CapacitorPlugin(
    name = "ReadAloud",
    permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone") }
)
public class ReadAloudPlugin extends Plugin {

    private static final String TAG = "ReadAloud";
    private static final long RESTART_DELAY_MS = 150;
    private static final int MAX_SOFT_ERRORS_IN_ROW = 8;

    private final Handler main = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private String language = "en-US";
    private boolean active = false;
    private int softErrorsInRow = 0;

    @PluginMethod
    public void status(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", SpeechRecognizer.isRecognitionAvailable(getContext()));
        ret.put("permission", getPermissionState("microphone") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void start(PluginCall call) {
        language = call.getString("language", "en-US");
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "afterPermission");
            return;
        }
        begin(call);
    }

    @PermissionCallback
    private void afterPermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            begin(call);
        } else {
            call.reject("Microphone permission denied", "no-permission");
        }
    }

    private void begin(PluginCall call) {
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            call.reject("No speech recognition service on this device", "unavailable");
            return;
        }
        main.post(() -> {
            active = true;
            softErrorsInRow = 0;
            listenOnce();
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        main.post(() -> {
            active = false;
            if (recognizer != null) {
                // stopListening (not cancel) so the last utterance still delivers its result.
                recognizer.stopListening();
            }
            call.resolve();
        });
    }

    private void listenOnce() {
        if (!active) return;
        destroyRecognizer();
        recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
        recognizer.setRecognitionListener(new Listener());

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language);
        intent.putExtra("android.speech.extra.EXTRA_ADDITIONAL_LANGUAGES", new String[] { language });
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());
        // Let readers pause between sentences without ending the session too early.
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2500);
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2000);
        try {
            recognizer.startListening(intent);
            emitState("listening");
        } catch (Exception ex) {
            Logger.error(TAG, "startListening failed", ex);
            emitError(-1, ex.getMessage(), true);
        }
    }

    private void restartSoon() {
        if (!active) return;
        main.postDelayed(this::listenOnce, RESTART_DELAY_MS);
    }

    private void destroyRecognizer() {
        if (recognizer != null) {
            try {
                recognizer.destroy();
            } catch (Exception ignored) {}
            recognizer = null;
        }
    }

    private void emitState(String state) {
        JSObject ret = new JSObject();
        ret.put("state", state);
        notifyListeners("state", ret);
    }

    private void emitText(String event, Bundle bundle) {
        ArrayList<String> matches = bundle.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches == null || matches.isEmpty()) return;
        JSObject ret = new JSObject();
        ret.put("text", matches.get(0));
        notifyListeners(event, ret);
    }

    private void emitError(int code, String message, boolean fatal) {
        Logger.info(TAG, "error " + code + " " + message + (fatal ? " (fatal)" : ""));
        JSObject ret = new JSObject();
        ret.put("code", code);
        ret.put("message", message);
        ret.put("fatal", fatal);
        notifyListeners("error", ret);
        if (fatal) {
            active = false;
            emitState("stopped");
        }
    }

    private static String errorName(int code) {
        switch (code) {
            case SpeechRecognizer.ERROR_AUDIO: return "audio";
            case SpeechRecognizer.ERROR_CLIENT: return "client";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "permission";
            case SpeechRecognizer.ERROR_NETWORK: return "network";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: return "network-timeout";
            case SpeechRecognizer.ERROR_NO_MATCH: return "no-match";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: return "busy";
            case SpeechRecognizer.ERROR_SERVER: return "server";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: return "speech-timeout";
            case 10: return "too-many-requests";
            case 11: return "server-disconnected";
            case 12: return "language-not-supported";
            case 13: return "language-unavailable";
            default: return "unknown";
        }
    }

    private class Listener implements RecognitionListener {

        @Override public void onReadyForSpeech(Bundle params) { emitState("ready"); }
        @Override public void onBeginningOfSpeech() { emitState("speech"); }
        @Override public void onRmsChanged(float rmsdB) {}
        @Override public void onBufferReceived(byte[] buffer) {}
        @Override public void onEndOfSpeech() { emitState("processing"); }
        @Override public void onEvent(int eventType, Bundle params) {}

        @Override
        public void onPartialResults(Bundle partial) {
            emitText("partial", partial);
        }

        @Override
        public void onResults(Bundle results) {
            softErrorsInRow = 0;
            emitText("final", results);
            if (active) restartSoon();
            else emitState("stopped");
        }

        @Override
        public void onError(int code) {
            String name = errorName(code);
            if (!active) {
                emitState("stopped");
                return;
            }
            boolean soft = code == SpeechRecognizer.ERROR_NO_MATCH
                || code == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                || code == SpeechRecognizer.ERROR_RECOGNIZER_BUSY
                || code == SpeechRecognizer.ERROR_CLIENT;
            if (soft && ++softErrorsInRow < MAX_SOFT_ERRORS_IN_ROW) {
                emitError(code, name, false);
                main.postDelayed(ReadAloudPlugin.this::listenOnce, 400);
            } else {
                emitError(code, name, true);
            }
        }
    }

    @Override
    protected void handleOnDestroy() {
        active = false;
        destroyRecognizer();
        super.handleOnDestroy();
    }
}
