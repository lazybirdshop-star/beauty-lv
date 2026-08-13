/**
 * Детерминированные фикстурные данные скриншот-харнесса
 * (BRAND_STYLE_ARCHITECTURE.md §16, шаг M0).
 *
 * По одной демо-организации на каждый designPresetKey — с одинаковым
 * набором услуг и опубликованных окон, привязанным к зафиксированной дате
 * FIXED_NOW. Существующий сид БД не трогается: харнесс поднимает собственный
 * фикстурный API-сервер (server.mjs) и направляет на него `next start` через
 * переменную API_URL — Postgres и apps/api в прогоне не участвуют.
 *
 * Тексты и состав данных одинаковы для всех ключей намеренно:
 * монохром-тест (§15) сравнивает миры «с чужим текстом».
 */

export const FIXED_NOW = '2026-02-09T12:00:00+02:00';
export const TIMEZONE = 'Europe/Riga';

export const DESIGN_PRESET_KEYS = ['luxury', 'poster', 'soft'];

/**
 * designPresetKey → [themePresetKey, fontPresetKey]. Зеркалит
 * defaultThemePreset/defaultFontPreset из DESIGN_PRESETS (shared-kernel):
 * так выглядит страница мастера, только что выбравшего стиль в Студии.
 */
const PRESET_DEFAULTS = {
  luxury: ['luxury', 'manrope-cormorant'],
  poster: ['riga-poster', 'onest-unbounded'],
  soft: ['blush-rose', 'onest'],
};

export function fixtureSlug(designPresetKey) {
  return `demo-${designPresetKey}`;
}

export const FIXTURE_CATEGORIES = [
  { id: 'cat-nails', name: 'Маникюр' },
  { id: 'cat-brows', name: 'Брови и ресницы' },
];

/** Форма — ApiService из features/public-profile/data.ts (priceAmount в минорных единицах). */
export const FIXTURE_SERVICES = [
  {
    id: 'svc-manicure',
    categoryId: 'cat-nails',
    name: 'Маникюр с покрытием',
    description: 'Аппаратный маникюр, выравнивание, гель-лак.',
    imageUrl: null,
    durationMinutes: 90,
    priceAmount: 3500,
    priceCurrency: 'EUR',
  },
  {
    id: 'svc-extension',
    categoryId: 'cat-nails',
    name: 'Наращивание ногтей',
    description: 'Гелевое наращивание, любая форма и длина.',
    imageUrl: null,
    durationMinutes: 150,
    priceAmount: 5500,
    priceCurrency: 'EUR',
  },
  {
    id: 'svc-brows',
    categoryId: 'cat-brows',
    name: 'Коррекция и окрашивание бровей',
    description: null,
    imageUrl: null,
    durationMinutes: 40,
    priceAmount: 1800,
    priceCurrency: 'EUR',
  },
  {
    id: 'svc-lashes',
    categoryId: 'cat-brows',
    name: 'Ламинирование ресниц',
    description: 'Эффект держится до восьми недель.',
    imageUrl: null,
    durationMinutes: 60,
    priceAmount: 4000,
    priceCurrency: 'EUR',
  },
  {
    id: 'svc-design',
    categoryId: null,
    name: 'Дизайн одного ногтя',
    description: null,
    imageUrl: null,
    durationMinutes: 15,
    priceAmount: 500,
    priceCurrency: 'EUR',
  },
];

export const FIXTURE_ADDONS = [
  { serviceId: 'svc-manicure', addonServiceId: 'svc-design' },
  { serviceId: 'svc-extension', addonServiceId: 'svc-design' },
];

function slot(id, startsAt, status = 'available') {
  return { id, startsAt, status };
}

/**
 * Окна привязаны к FIXED_NOW (понедельник 2026-02-09): ближайшее — завтра,
 * вторник 10 февраля в 10:00; занятое окно и окно в следующем месяце дают
 * зачёркнутый чип и подсказку пейджингу. Время — с явным смещением EET,
 * таймзона процесса зафиксирована харнессом (TIMEZONE).
 */
export const FIXTURE_SLOTS = [
  slot('slot-1', '2026-02-10T10:00:00.000+02:00'),
  slot('slot-2', '2026-02-10T12:00:00.000+02:00'),
  slot('slot-3', '2026-02-10T15:30:00.000+02:00'),
  slot('slot-4', '2026-02-11T11:00:00.000+02:00', 'booked'),
  slot('slot-5', '2026-02-11T14:00:00.000+02:00'),
  slot('slot-6', '2026-02-13T09:30:00.000+02:00'),
  slot('slot-7', '2026-02-17T10:00:00.000+02:00'),
  slot('slot-8', '2026-03-03T12:00:00.000+02:00'),
];

/** Форма — ApiOrganization из features/public-profile/data.ts. */
function organization(designPresetKey) {
  const [themePresetKey, fontPresetKey] = PRESET_DEFAULTS[designPresetKey];
  return {
    id: `fixture-${designPresetKey}`,
    slug: fixtureSlug(designPresetKey),
    name: 'Анна Морозова',
    description: 'Маникюр и уход за руками в центре Риги. Стерильно, спокойно, всегда вовремя.',
    logoUrl: null,
    coverUrl: null,
    publicDisplayName: 'Студия «Аврора»',
    defaultLocale: 'ru',
    showAvatar: true,
    designPresetKey,
    themePresetKey,
    fontPresetKey,
    themeOverrides: null,
    heroStyle: null,
    backgroundImageUrl: null,
    contactPhone: '+371 2012 3456',
    addressLine: 'ул. Тербатас 45, 2 этаж',
    city: 'Рига',
    instagramHandle: 'avrora.studio',
    showPricesSection: true,
    showContactsSection: true,
  };
}

export const FIXTURE_ORGANIZATIONS = DESIGN_PRESET_KEYS.map(organization);