/**
 * Опись всего, что продукт кладёт в устройство посетителя.
 *
 * Статья 5(3) Директивы 2002/58/EC (в Латвии — Elektronisko sakaru likums)
 * говорит не про «cookie», а про **любое** чтение и запись в оконечном
 * оборудовании: localStorage и sessionStorage подпадают ровно так же. Поэтому
 * опись одна и на куки, и на локальное хранилище — иначе политика перечисляла
 * бы половину того, что происходит на самом деле.
 *
 * Отсюда читают трое: политика cookie (печатает таблицу), баннер согласия
 * (решает, нужен ли выбор или достаточно уведомления) и тест, который следит,
 * чтобы опись не отстала от кода. Списка в двух местах быть не должно.
 */

/**
 * Категории по назначению, а не по сроку жизни.
 *
 * `necessary` — без этого сервис не работает: согласия не требует
 * (ст. 5(3), исключение «strictly necessary»). Остальные требуют
 * предварительного согласия и по умолчанию выключены.
 */
export const STORAGE_CATEGORIES = ['necessary', 'preferences', 'analytics', 'marketing'] as const;

export type StorageCategory = (typeof STORAGE_CATEGORIES)[number];

/** Категории, которые нельзя отключить, потому что без них ничего не работает. */
export const ALWAYS_ON: readonly StorageCategory[] = ['necessary'];

export type StorageMedium = 'cookie' | 'localStorage';

export interface StorageRecord {
  /** Имя куки или ключ хранилища — ровно как в коде. */
  readonly name: string;
  readonly medium: StorageMedium;
  readonly category: StorageCategory;
  /**
   * Срок жизни в секундах. `null` — до закрытия вкладки или до очистки
   * хранилища вручную: у localStorage срока нет по определению.
   */
  readonly maxAgeSeconds: number | null;
  /** Кто ставит: первая сторона или сторонний сервис. */
  readonly party: 'first' | 'third';
  /** На каком экране появляется. Ключ строки в словаре политики. */
  readonly scope: 'landing' | 'dashboard' | 'publicPage' | 'admin';
}

const DAY = 60 * 60 * 24;

/**
 * Опись на 2026-08-25.
 *
 * Аналитики, рекламных пикселей и сторонних тегов в продукте нет ни одного —
 * поэтому все записи ниже строго необходимые, и баннер не предлагает выбора,
 * которого не существует. Появится первый счётчик — он придёт сюда со своей
 * категорией, и баннер сам станет диалогом согласия (см. `consent.ts`).
 */
export const STORAGE_INVENTORY: readonly StorageRecord[] = [
  {
    // apps/web/src/lib/i18n/config.ts → LOCALE_COOKIE
    name: 'amolie_locale',
    medium: 'cookie',
    category: 'necessary',
    maxAgeSeconds: 365 * DAY,
    party: 'first',
    scope: 'landing',
  },
  {
    // apps/web/src/features/legal/consent.ts → CONSENT_COOKIE
    name: 'amolie_storage_consent',
    medium: 'cookie',
    category: 'necessary',
    maxAgeSeconds: 180 * DAY,
    party: 'first',
    scope: 'landing',
  },
  {
    // apps/web/src/lib/auth-session.ts → ACCESS_TOKEN_COOKIE
    name: 'access_token',
    medium: 'cookie',
    category: 'necessary',
    maxAgeSeconds: 12 * 60 * 60,
    party: 'first',
    scope: 'dashboard',
  },
  {
    // apps/web/src/lib/auth-session.ts → IMPERSONATOR_TOKEN_COOKIE
    name: 'impersonator_token',
    medium: 'cookie',
    category: 'necessary',
    maxAgeSeconds: 30 * 60,
    party: 'first',
    scope: 'admin',
  },
  {
    // apps/web/src/features/client-account/device-visits.ts → VISITS_KEY
    name: 'amolie.device-visits.v1',
    medium: 'localStorage',
    category: 'necessary',
    maxAgeSeconds: null,
    party: 'first',
    scope: 'publicPage',
  },
  {
    // apps/web/src/features/client-account/device-visits.ts → GUEST_KEY
    name: 'amolie.device-guest.v1',
    medium: 'localStorage',
    category: 'necessary',
    maxAgeSeconds: null,
    party: 'first',
    scope: 'publicPage',
  },
  {
    // next-themes, apps/web/src/app/providers.tsx
    name: 'theme',
    medium: 'localStorage',
    category: 'necessary',
    maxAgeSeconds: null,
    party: 'first',
    scope: 'dashboard',
  },
];

/**
 * Категории, которые действительно встречаются в описи и требуют согласия.
 *
 * Пусто — значит выбирать посетителю нечего, и честный интерфейс здесь
 * уведомление, а не кнопки «Принять» и «Отклонить» над одними лишь
 * необходимыми куками. Тёмный паттерн наоборот: спросить согласия там, где
 * отказ ничего не меняет.
 */
export function optionalCategories(
  inventory: readonly StorageRecord[] = STORAGE_INVENTORY,
): StorageCategory[] {
  const found = new Set(
    inventory.map((record) => record.category).filter((category) => !ALWAYS_ON.includes(category)),
  );

  return STORAGE_CATEGORIES.filter((category) => found.has(category));
}
