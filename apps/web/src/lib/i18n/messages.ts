/**
 * The dictionary is a plain nested object, typed off the Russian one, so a
 * missing or misspelt key is a build error rather than a string that renders
 * as `nav.bookings` in front of a client.
 *
 * What is deliberately absent: anything the master writes. Service names,
 * descriptions, her own display name and her notes are her words, and a
 * product that machine-translated «Наращивание ногтей» into a shop window
 * would be putting words in her mouth.
 */
export const ru = {
  nav: {
    home: 'Главная',
    calendar: 'Календарь',
    bookings: 'Записи',
    clients: 'Клиенты',
    services: 'Услуги и цены',
    page: 'Страница мастера',
    finance: 'Финансы',
    settings: 'Настройки',
    more: 'Ещё',
    masters: 'Мастера',
    users: 'Пользователи',
    inviteCodes: 'Инвайт-коды',
    subscriptions: 'Подписки',
    logs: 'Логи',
    platformSettings: 'Настройки платформы',
  },
  common: {
    toggleTheme: 'Переключить тему',
    logout: 'Выйти',
    openMenu: 'Открыть меню',
    save: 'Сохранить',
    saving: 'Сохраняем…',
    cancel: 'Отмена',
    delete: 'Удалить',
    edit: 'Редактировать',
    close: 'Закрыть',
    back: 'Назад',
    next: 'Дальше',
    loading: 'Загружаем…',
    empty: 'Пока пусто',
  },
  bookings: {
    filterAll: 'Все',
    filterNew: 'Новые',
    filterConfirmed: 'Подтверждённые',
    filterCompleted: 'Завершённые',
    statusNew: 'Новая',
    statusConfirmed: 'Подтверждена',
    statusCompleted: 'Завершена',
    statusCancelled: 'Отменена',
    statusCancelledByClient: 'Отменена клиентом',
    statusNoShow: 'Не пришёл',
    empty: 'Записей пока нет.',
    title: 'Записи',
    new: 'Новая запись',
    groupPending: 'Ждут подтверждения',
    groupPendingHint: 'Клиент записался, но ещё не знает, приняли ли вы запись.',
    groupToday: 'Сегодня',
    groupUpcoming: 'Дальше',
    groupPast: 'Прошедшие и отменённые',
    confirm: 'Подтвердить',
    complete: 'Завершить',
    noShow: 'Не пришёл',
    openClient: 'Открыть карточку клиента',
  },
  clients: {
    title: 'Клиенты',
    flagNone: 'Без метки',
    flagFavourite: 'Любимый клиент',
    flagAttention: 'Осторожно',
    notes: 'Заметка',
    notesHint: 'Метку и заметку видите только вы — клиент их не увидит.',
  },
  settings: {
    title: 'Настройки',
    dashboardLanguage: 'Язык кабинета',
    dashboardLanguageHint: 'На каком языке вы работаете в панели. Клиентов не касается.',
  },
  profilePage: {
    publicLanguage: 'Язык страницы для клиентов',
    publicLanguageHint:
      'На каком языке клиенты видят вашу страницу. Названия и описания услуг остаются как вы их написали.',
  },
  publicPage: {
    book: 'Записаться',
    pickDate: 'Выберите дату',
    pickTime: 'Выберите время',
    chooseServices: 'Выберите услуги',
    addToBooking: 'Добавить к записи?',
    whenConvenient: 'Когда вам удобно?',
    yourContacts: 'Ваши контакты',
    nearestWindow: 'Ближайшее свободное окно',
    schedule: 'Расписание',
    servicesAndPrices: 'Услуги и цены',
    contacts: 'Контакты',
    name: 'Имя',
    phone: 'Телефон',
    optional: 'необязательно',
    bookingClosed: 'Запись пока закрыта',
    bookingClosedHint: 'Мастер ещё не открыл окна. Загляните чуть позже.',
  },
} as const;

/**
 * Keys come from the Russian dictionary, values widen to `string`. Without
 * the widening `as const` made every value its own literal type and a
 * translation could not differ from the original — the type system would
 * have enforced that nothing is ever translated.
 */
export type Messages = {
  [Section in keyof typeof ru]: { [Key in keyof (typeof ru)[Section]]: string };
};

/** A partial translation falls back to Russian key by key, never to a blank. */
export type PartialMessages = {
  [K in keyof Messages]?: Partial<Messages[K]>;
};
