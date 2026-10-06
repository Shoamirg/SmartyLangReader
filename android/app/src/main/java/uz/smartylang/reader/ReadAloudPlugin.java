package uz.smartylang.reader;

import android.Manifest;
import android.content.Context;
import android.content.res.AssetManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;
import org.vosk.LibVosk;
import org.vosk.LogLevel;
import org.vosk.Model;
import org.vosk.Recognizer;
import org.vosk.android.RecognitionListener;
import org.vosk.android.SpeechService;

/**
 * Offline read-aloud recognizer (Vosk). Models for uz / ru / en ship inside the
 * APK (assets/vosk/<lang>) and are unpacked to internal storage on first use,
 * so recognition works with no internet and no Google app.
 *
 * Events to JS: "state" (loading | listening | stopped), "partial" (current
 * utterance so far), "final" (finished utterance), "error".
 */
@CapacitorPlugin(
    name = "ReadAloud",
    permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone") }
)
public class ReadAloudPlugin extends Plugin implements RecognitionListener {

    private static final String TAG = "ReadAloud";
    private static final float SAMPLE_RATE = 16000f;
    /** Bump when the bundled models change so phones re-unpack them. */
    private static final int MODEL_VERSION = 1;

    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Map<String, Model> models = new HashMap<>();
    private SpeechService speechService;
    private Recognizer recognizer;
    /** False once the user pressed Stop, even if the model is still loading. */
    private volatile boolean wanted = false;

    @Override
    public void load() {
        LibVosk.setLogLevel(LogLevel.WARNINGS);
    }

    @PluginMethod
    public void start(PluginCall call) {
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
        String lang = langCode(call.getString("language", "en-US"));
        shutdownService();
        wanted = true;
        emitState("loading");
        worker.execute(() -> {
            try {
                Model model = loadModel(lang);
                if (!wanted) {
                    emitState("stopped");
                    call.resolve();
                    return;
                }
                recognizer = new Recognizer(model, SAMPLE_RATE);
                speechService = new SpeechService(recognizer, SAMPLE_RATE);
                speechService.startListening(this);
                emitState("listening");
                call.resolve();
            } catch (Exception ex) {
                Logger.error(TAG, "start failed", ex);
                shutdownService();
                emitState("stopped");
                call.reject(String.valueOf(ex.getMessage()), "start-failed");
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        wanted = false;
        if (speechService != null) {
            // stop() flushes the last utterance through onFinalResult.
            speechService.stop();
        } else {
            emitState("stopped");
        }
        call.resolve();
    }

    private static String langCode(String locale) {
        String code = locale.toLowerCase().split("[-_]")[0];
        return code.equals("uz") || code.equals("ru") ? code : "en";
    }

    private synchronized Model loadModel(String lang) throws IOException {
        Model cached = models.get(lang);
        if (cached != null) return cached;
        File dir = unpackModel(lang);
        Model model = new Model(dir.getAbsolutePath());
        models.put(lang, model);
        return model;
    }

    /** Copy assets/vosk/<lang> to internal storage once per app version. */
    private File unpackModel(String lang) throws IOException {
        Context ctx = getContext();
        File target = new File(ctx.getFilesDir(), "vosk/" + lang);
        File marker = new File(target, ".unpacked-" + MODEL_VERSION);
        if (marker.exists()) return target;
        deleteRecursive(target);
        copyAssetDir(ctx.getAssets(), "vosk/" + lang, target);
        if (!marker.createNewFile()) throw new IOException("cannot write model marker");
        return target;
    }

    private static void copyAssetDir(AssetManager assets, String path, File dest) throws IOException {
        String[] children = assets.list(path);
        if (children == null || children.length == 0) {
            File parent = dest.getParentFile();
            if (parent != null && !parent.exists() && !parent.mkdirs()) throw new IOException("mkdir " + parent);
            try (InputStream in = assets.open(path); OutputStream out = new FileOutputStream(dest)) {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            return;
        }
        if (!dest.exists() && !dest.mkdirs()) throw new IOException("mkdir " + dest);
        for (String child : children) copyAssetDir(assets, path + "/" + child, new File(dest, child));
    }

    private static void deleteRecursive(File f) {
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteRecursive(k);
        //noinspection ResultOfMethodCallIgnored
        f.delete();
    }

    private void shutdownService() {
        if (speechService != null) {
            speechService.shutdown();
            speechService = null;
        }
        if (recognizer != null) {
            recognizer.close();
            recognizer = null;
        }
    }

    private void emitState(String state) {
        JSObject ret = new JSObject();
        ret.put("state", state);
        notifyListeners("state", ret);
    }

    private void emitText(String event, String json, String key) {
        try {
            String text = new JSONObject(json).optString(key, "").trim();
            if (text.isEmpty()) return;
            JSObject ret = new JSObject();
            ret.put("text", text);
            notifyListeners(event, ret);
        } catch (Exception ex) {
            Logger.error(TAG, "bad vosk json", ex);
        }
    }

    // --- Vosk RecognitionListener (called on the main thread) ---

    @Override
    public void onPartialResult(String hypothesis) {
        emitText("partial", hypothesis, "partial");
    }

    @Override
    public void onResult(String hypothesis) {
        emitText("final", hypothesis, "text");
    }

    @Override
    public void onFinalResult(String hypothesis) {
        emitText("final", hypothesis, "text");
        shutdownService();
        emitState("stopped");
    }

    @Override
    public void onError(Exception e) {
        JSObject ret = new JSObject();
        ret.put("code", -1);
        ret.put("message", String.valueOf(e.getMessage()));
        ret.put("fatal", true);
        notifyListeners("error", ret);
        shutdownService();
        emitState("stopped");
    }

    @Override
    public void onTimeout() {
        shutdownService();
        emitState("stopped");
    }

    @Override
    protected void handleOnDestroy() {
        shutdownService();
        for (Model m : models.values()) m.close();
        models.clear();
        worker.shutdown();
        super.handleOnDestroy();
    }
}
