# SmartyLang Reader

A small Android app built on SmartyLang's read-aloud logic. Pick Uzbek, Russian or English, pick a level, read a text aloud, and every word is colored as you read: green = correct, amber = close, red = wrong or skipped. You get an accuracy score at the end.

- 500 texts per language (5 levels × 100), taken from the SmartyLang repo and bundled in the APK.
- Scoring: `src/lib/scoring.ts` is a port of SmartyLang's `alignWords`. Uzbek apostrophes (oʻ / o') and Russian ё/е are treated as the same letter.
- Speech: fully offline. It uses Vosk with small uz/ru/en models bundled in the APK, through the app's own native plugin (`android/app/src/main/java/uz/smartylang/reader/ReadAloudPlugin.java`). The app has no internet permission. Models unpack to internal storage the first time each language is used.
- Progress only moves forward. Each spoken sentence is matched from the reader's current position, and marked words are locked (`applyUtterance` in `scoring.ts`).

## Build
The speech models are not in git (about 260 MB). Download them once:
```
# into .models/assets/vosk/{uz,ru,en}
https://alphacephei.com/vosk/models/vosk-model-small-uz-0.22.zip     -> .models/assets/vosk/uz
https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip     -> .models/assets/vosk/ru
https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip  -> .models/assets/vosk/en
```
```
npm install
npm test                      # scoring tests
npm run build && npx cap sync android
cd android && JAVA_HOME=<JDK 21> ./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```
Refresh texts from the SmartyLang repo: `python scripts/extract_texts.py ../SmartyLang`
