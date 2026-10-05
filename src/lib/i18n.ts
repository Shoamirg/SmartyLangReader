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
  },
};
