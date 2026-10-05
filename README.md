# SmartyLang Reader

A small Android app built on SmartyLang's read-aloud logic. Pick Uzbek, Russian or English, pick a level, read a text aloud, and every word is colored as you read: green = correct, amber = close, red = wrong or skipped. You get an accuracy score at the end.

- 500 texts per language (5 levels × 100), taken from the SmartyLang repo and bundled in the APK.
- Scoring: `src/lib/scoring.ts` is a port of SmartyLang's `alignWords`. Uzbek apostrophes (oʻ / o') and Russian ё/е are treated as the same letter.
- Speech: Android's built-in recognizer, through `@capacitor-community/speech-recognition`. The Google app must be installed. It needs internet for Uzbek on most phones.

## Build
```
npm install
npm test                      # scoring tests
npm run build && npx cap sync android
cd android && JAVA_HOME=<JDK 21> ./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```
Refresh texts from the SmartyLang repo: `python scripts/extract_texts.py ../SmartyLang`
