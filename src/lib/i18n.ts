import type { Lang } from './scoring';

export const LANGS: { code: Lang; label: string; flag: string; locale: string }[] = [
  { code: 'uz', label: 'Oʻzbekcha', flag: 'UZ', locale: 'uz-UZ' },
  { code: 'ru', label: 'Русский', flag: 'RU', locale: 'ru-RU' },
  { code: 'en', label: 'English', flag: 'EN', locale: 'en-US' },
];

export const LEVELS = ['Beginner', 'Elementary', 'Pre-Intermediate', 'Intermediate', 'Advanced'] as const;
export type Level = (typeof LEVELS)[number];

type Strings = {
  chooseLang: string;
  levels: Record<Level, string>;
  start: string;
  stop: string;
  retry: string;
  next: string;
  back: string;
  listening: string;
  tapToRead: string;
  accuracy: string;
  read: string;
  correct: string;
  close: string;
  wrong: string;
  result: string;
  loading: string;
  errNoPermission: string;
  errUnavailable: string;
  errStart: string;
  best: string;
  errNetwork: string;
  errLanguage: string;
  errNoSpeech: string;
  errOther: string;
  stReady: string;
  stSpeech: string;
  stProcessing: string;
};

export const STRINGS: Record<Lang, Strings> = {
  uz: {
    chooseLang: 'Tilni tanlang',
    levels: {
      Beginner: 'Boshlangʻich',
      Elementary: 'Elementar',
      'Pre-Intermediate': 'Oʻrtadan past',
      Intermediate: 'Oʻrta',
      Advanced: 'Yuqori',
    },
    start: 'Oʻqishni boshlash',
    stop: 'Toʻxtatish',
    retry: 'Qayta oʻqish',
    next: 'Keyingi matn',
    back: 'Orqaga',
    listening: 'Tinglayapman… matnni ovoz chiqarib oʻqing',
    tapToRead: 'Tugmani bosing va matnni ovoz chiqarib oʻqing',
    accuracy: 'Aniqlik',
    read: 'Oʻqildi',
    correct: 'Toʻgʻri',
    close: 'Deyarli',
    wrong: 'Xato',
    result: 'Natija',
    loading: 'Yuklanmoqda…',
    errNoPermission: 'Mikrofonga ruxsat berilmadi. Sozlamalardan ruxsat bering.',
    errUnavailable: 'Bu qurilmada nutqni tanish mavjud emas (Google ilovasini oʻrnating).',
    errStart: 'Tinglashni boshlab boʻlmadi. Qayta urinib koʻring.',
    best: 'Eng yaxshi',
    errNetwork: 'Internet aloqasi yoʻq. Oʻzbek tilini tanish uchun internet kerak.',
    errLanguage: 'Telefoningizdagi nutqni tanish xizmati oʻzbek tilini qoʻllamaydi. Google ilovasini yangilang.',
    errNoSpeech: 'Ovoz eshitilmadi. Telefonni yaqinroq tuting va balandroq oʻqing.',
    errOther: 'Nutqni tanishda xatolik. Qayta urinib koʻring.',
    stReady: '🎙️ Mikrofon tayyor — oʻqishni boshlang',
    stSpeech: '🔊 Eshityapman…',
    stProcessing: '⏳ Tahlil qilinmoqda…',
  },
  ru: {
    chooseLang: 'Выберите язык',
    levels: {
      Beginner: 'Начальный',
      Elementary: 'Элементарный',
      'Pre-Intermediate': 'Ниже среднего',
      Intermediate: 'Средний',
      Advanced: 'Продвинутый',
    },
    start: 'Начать чтение',
    stop: 'Стоп',
    retry: 'Читать снова',
    next: 'Следующий текст',
    back: 'Назад',
    listening: 'Слушаю… читайте текст вслух',
    tapToRead: 'Нажмите кнопку и читайте текст вслух',
    accuracy: 'Точность',
    read: 'Прочитано',
    correct: 'Верно',
    close: 'Почти',
    wrong: 'Ошибка',
    result: 'Результат',
    loading: 'Загрузка…',
    errNoPermission: 'Нет доступа к микрофону. Разрешите его в настройках.',
    errUnavailable: 'Распознавание речи недоступно (установите приложение Google).',
    errStart: 'Не удалось начать запись. Попробуйте ещё раз.',
    best: 'Лучший',
    errNetwork: 'Нет интернета. Для распознавания речи нужен интернет.',
    errLanguage: 'Служба распознавания на телефоне не поддерживает этот язык. Обновите приложение Google.',
    errNoSpeech: 'Голос не слышен. Держите телефон ближе и читайте громче.',
    errOther: 'Ошибка распознавания речи. Попробуйте ещё раз.',
    stReady: '🎙️ Микрофон готов — начинайте читать',
    stSpeech: '🔊 Слышу вас…',
    stProcessing: '⏳ Обработка…',
  },
  en: {
    chooseLang: 'Choose a language',
    levels: {
      Beginner: 'Beginner',
      Elementary: 'Elementary',
      'Pre-Intermediate': 'Pre-Intermediate',
      Intermediate: 'Intermediate',
      Advanced: 'Advanced',
    },
    start: 'Start reading',
    stop: 'Stop',
    retry: 'Read again',
    next: 'Next text',
    back: 'Back',
    listening: 'Listening… read the text aloud',
    tapToRead: 'Tap the button and read the text aloud',
    accuracy: 'Accuracy',
    read: 'Read',
    correct: 'Correct',
    close: 'Close',
    wrong: 'Wrong',
    result: 'Result',
    loading: 'Loading…',
    errNoPermission: 'Microphone permission denied. Allow it in Settings.',
    errUnavailable: 'Speech recognition is not available on this device (install the Google app).',
    errStart: 'Could not start listening. Please try again.',
    best: 'Best',
    errNetwork: 'No internet connection. Speech recognition needs internet.',
    errLanguage: "This phone's speech service doesn't support this language. Update the Google app.",
    errNoSpeech: 'No voice heard. Hold the phone closer and read louder.',
    errOther: 'Speech recognition error. Please try again.',
    stReady: '🎙️ Microphone ready — start reading',
    stSpeech: '🔊 Hearing you…',
    stProcessing: '⏳ Processing…',
  },
};
