# SmartyLang Reader

**Read aloud. See every word checked. Uzbek · Russian · English. Works offline.**

SmartyLang Reader is a small Android app for read-aloud practice. Pick a language and a level, open a text and read it out loud. The app listens and colors each word as you go:

| Color | Meaning |
|---|---|
| 🟩 Green | Pronounced correctly |
| 🟨 Amber | Close: a small mistake on a longer word |
| 🟥 Red | Wrong or skipped |
| 🟦 Blue highlight | The word you are on now |

After reading, you see your **accuracy** (correct ÷ words read), how much of the text you read, and counts of correct, close and wrong words. The best score for each text is saved on the phone.

## Download

👉 **[Latest APK on the Releases page](../../releases/latest)**

1. Download `SmartyLangReader-v2.0.apk` on an Android phone (Android 7.0 or newer).
2. Open it and tap **Install**. If Android blocks it, allow *Install unknown apps* for the app you opened it from (Telegram, Chrome, Files…).
3. Open the app and allow the **microphone** the first time you tap 🎤.

No internet, no account and no Google app are needed. The app does not even request internet access.

## Features

- **3 languages:** Oʻzbekcha, Русский, English. The app's buttons and messages switch to the chosen language too.
- **1,500 texts:** 5 levels (Beginner → Advanced) × 100 texts per language.
- **Live word-by-word checking** while you read, with the current word kept on screen.
- **Progress only moves forward.** Each sentence you say is matched from where you are, and words already marked never jump back to the start of the paragraph. Coughs or off-text talk are ignored.
- **Continue / Read again / Next text** after you stop.
- **Fully offline speech recognition** with [Vosk](https://alphacephei.com/vosk/). The Uzbek, Russian and English models are inside the APK.
- Light and dark theme follow the phone's setting.

## How the checking works

1. **Speech → words.** Vosk turns your voice into text on the phone, one sentence at a time.
2. **Matching.** The spoken words are aligned with the text (`src/lib/scoring.ts`, ported from SmartyLang's `alignWords`):
   - exact match → correct
   - a near miss on a word of 4+ letters (edit distance 1, or 2 for words of 6+ letters) → close
   - ASR splitting one word into two ("basket ball") is joined back together
   - extra spoken words are skipped, and skipped text words are marked wrong
3. **Language rules.** Uzbek apostrophes (`oʻ`, `o'`, `o’`) count as the same letter. Russian `ё` = `е`. Case and punctuation are ignored.
4. **Locking.** Every finished sentence advances the reading cursor, and words behind it are final.

**Accuracy limits:** these are small offline models. The Uzbek model's published word error rate is about 13%, so a correctly read word can occasionally be marked red, especially with noise or fast reading. Read clearly at a normal pace.

## First launch per language

The first time you use a language, the app unpacks its speech model (about 70–100 MB) into the phone's storage. This takes a few seconds and shows *"Loading offline speech model…"*. After that it starts right away.

## Tech

| Part | Tools |
|---|---|
| UI | React 19 + TypeScript + Vite |
| Android shell | Capacitor 8 |
| Speech | Vosk Android 0.3.75 with small models `uz-0.22`, `ru-0.22`, `en-us-0.15`, through the app's own native plugin `ReadAloudPlugin.java` |
| Texts | Bundled JSON (`public/texts/{uz,ru,en}.json`) |

```
src/
  App.tsx              language, level and text list
  Reader.tsx           reading screen, live coloring, stats
  lib/scoring.ts       word alignment, accuracy, forward-only progress
  lib/useRecognizer.ts bridge to the native recognizer (browser fallback for desktop)
  lib/i18n.ts          UI strings in uz / ru / en
android/app/src/main/java/uz/smartylang/reader/
  ReadAloudPlugin.java offline Vosk recognizer
scripts/extract_texts.py   pulls texts from the SmartyLang repo
tests/scoring.test.ts      scoring tests
```

## Build from source

Requirements: Node 20+, Android SDK, **JDK 21** (Gradle 8.14 does not run on JDK 25).

The speech models are not stored in git (about 260 MB). Download and unzip them once:

| Language | Model | Unzip into |
|---|---|---|
| Uzbek | [vosk-model-small-uz-0.22](https://alphacephei.com/vosk/models/vosk-model-small-uz-0.22.zip) | `.models/assets/vosk/uz` |
| Russian | [vosk-model-small-ru-0.22](https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip) | `.models/assets/vosk/ru` |
| English | [vosk-model-small-en-us-0.15](https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip) | `.models/assets/vosk/en` |

```bash
npm install
npm test                       # scoring tests
npm run build && npx cap sync android
cd android && JAVA_HOME=/path/to/jdk-21 ./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```

To refresh the texts from a SmartyLang checkout: `python scripts/extract_texts.py ../SmartyLang`

## Credits

- Reading texts and the original word-alignment logic come from [SmartyLang](https://github.com/mribroxim/SmartyLang).
- Offline speech recognition: [Vosk](https://alphacephei.com/vosk/) by Alpha Cephei (Apache 2.0).

---

### Oʻzbekcha qisqacha

**SmartyLang Reader** — matnni ovoz chiqarib oʻqish va talaffuzni tekshirish uchun Android ilova. Tilni (oʻzbek, rus, ingliz) va darajani tanlang, matnni oʻqing. Ilova har bir soʻzni rang bilan belgilaydi: yashil — toʻgʻri, sariq — deyarli toʻgʻri, qizil — xato. Oxirida aniqlik foizini koʻrsatadi. Internet kerak emas, hammasi telefonning oʻzida ishlaydi.

### Кратко по-русски

**SmartyLang Reader** — Android-приложение для чтения вслух с проверкой произношения. Выберите язык (узбекский, русский, английский) и уровень, читайте текст. Каждое слово подсвечивается: зелёное — верно, жёлтое — почти верно, красное — ошибка. В конце показывается точность в процентах. Интернет не нужен, всё работает на телефоне.
