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
    name: 'Название',
    description: 'Описание',
    minutesShort: 'мин',
    from: 'от',
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
  services: {
    tabList: 'Список',
    tabCategories: 'Категории',
    tabShowcase: 'Витрина',
    newService: 'Новая услуга',
    editService: 'Редактировать услугу',
    newCategory: 'Новая категория',
    editCategory: 'Редактировать категорию',
    noCategory: 'Без категории',
    emptyCategory: 'Пока без услуг',
    hidden: 'Скрыта',
    hiddenFromClients: 'скрыта у клиентов',
    active: 'Активна',
    showToClients: 'Показывать клиентам',
    show: 'Показывать',
    moveUp: 'Выше',
    moveDown: 'Ниже',
    suggestAlso: 'Предложить дополнительно',
    colorLabel: 'Цвет метки',
    priceFrom: 'Цена «от»',
    addService: 'Добавить услугу',
    addCategory: 'Добавить категорию',
    categoryNamePlaceholder: 'Например, Стрижка',
    categoryHiddenHint:
      'Выключенная категория исчезает со страницы записи. Услуги внутри остаются активными и видны отдельно.',
    categoriesHint:
      'Категории группируют услуги на странице записи: «Стрижка» → «Fader cut», «Ногти» → «Маникюр». Без них клиент видит один общий список.',
    toggleCategory: 'Показывать категорию «{name}»',
    deleteCategoryTitle: 'Удалить категорию?',
    deleteCategoryText: '«{name}» будет удалена.',
    deleteCategoryWithServices:
      '«{name}» будет удалена. Услуги внутри ({count}) останутся и перейдут в «Без категории» — ничего не пропадёт.',
    deleteServiceTitle: 'Удалить услугу?',
    deleteServiceText: '«{name}» будет скрыта из прайса и записи.',
    emptyServices:
      'Пока нет ни одной услуги. Добавьте первую, чтобы клиенты видели её в прайсе и при записи.',
    noColor: 'Без цвета',
    pricingEmpty:
      'Пока нет ни одной услуги — добавьте их на экране «Услуги», отсюда можно будет управлять видимостью в публичном прайсе.',
    pricingHint:
      'Это ровно то, что видят клиенты на публичной странице «Цены». Выключенные услуги скрыты из прайса и недоступны для записи.',
    showInPricing: 'Показывать «{name}» в прайсе',
    categoryLabel: 'Категория',
    hiddenSuffix: ' (скрыта)',
    durationLabel: 'Длительность, мин',
    priceLabel: 'Цена, €',
    photoLabel: 'Фото примера работы',
    photoHint: 'Ссылка на изображение. Клиент увидит его в разделе «Цены».',
    addonsHint: 'Клиент выберет эту услугу — и увидит предложение добавить отмеченные ниже.',
    // Plural forms, selected by Intl.PluralRules: Russian needs three, Latvian
    // a different three (0 and 10–20 take their own), English two.
    serviceCountZero: 'услуг',
    serviceCountOne: 'услуга',
    serviceCountFew: 'услуги',
    serviceCountMany: 'услуг',
    serviceCountOther: 'услуг',
  },
  clients: {
    newClient: 'Новый клиент',
    editClient: 'Редактировать клиента',
    blocked: 'Заблокирован',
    block: 'Заблокировать клиента',
    unblock: 'Разблокировать клиента',
    totalVisits: 'Всего записей (без отменённых)',
    lastVisit: 'Последний визит',
    favouriteService: 'Чаще всего выбирает',
    noVisits: 'ещё не было визитов',
    noCompleted: 'ещё не было завершённых визитов',
    noData: 'ещё нет данных',
    saveFailed: 'Не удалось сохранить клиента',
    phoneTaken: 'Клиент с таким телефоном уже есть в списке',
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
    onlineBooking: 'Запись онлайн',
    callMaster: 'Позвонить мастеру',
    masterInstagram: 'Instagram мастера',
    bookOnline: 'запись онлайн',
    servicesCount: 'Услуг',
    freeSlots: 'Свободно окон',
    minutesShort: 'мин',
    hoursShort: 'ч',
    serviceDetails: 'Нажмите на услугу, чтобы увидеть подробности',
    duration: 'Длительность',
    otherServices: 'Другие услуги',
    suggestHint: 'Мастер советует добавить к выбранному. Можно пропустить.',
    pickingTime: 'Подбираем свободное время…',
    noTimeFor: 'На выбранные услуги нужно',
    noTimeTail:
      'подряд — столько свободного времени сейчас нет. Уберите что-нибудь из записи или свяжитесь с мастером напрямую.',
    requestSent: 'Заявка отправлена',
    weAwaitYou: 'ждём вас',
    done: 'Готово',
    cancelByPhone: 'Отменить или перенести — по телефону мастера',
    slotTaken: 'Это время уже заняли. Выберите другое и попробуйте снова.',
    bookingRefused: 'Не удалось создать запись. Свяжитесь с мастером напрямую.',
    sending: 'Отправляем…',
    toContacts: 'К контактам',
    timeNotChosen: 'Время не выбрано',
    servicesShort: 'Услуги',
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

/**
 * `fmt(t.services.deleteCategoryText, { name })` — placeholders stay inside the
 * string so a translator can move them where her grammar needs them, which is
 * the whole reason the sentence is not assembled from concatenated fragments.
 */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/**
 * Picks the plural form the locale's own grammar asks for. Russian wants three
 * forms, Latvian a different three (nought and the teens take their own), and
 * English two — so the choice cannot live in the call site.
 */
export function plural(
  locale: string,
  count: number,
  forms: { zero: string; one: string; few: string; many: string; other: string },
): string {
  const category = new Intl.PluralRules(locale).select(count) as keyof typeof forms | 'two';
  return category === 'two' ? forms.other : (forms[category] ?? forms.other);
}

/** A partial translation falls back to Russian key by key, never to a blank. */
export type PartialMessages = {
  [K in keyof Messages]?: Partial<Messages[K]>;
};
