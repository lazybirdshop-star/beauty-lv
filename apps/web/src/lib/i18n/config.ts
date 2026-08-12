/**
 * Locale is read from the database, never from the URL.
 *
 * The obvious route is next-intl with a `[locale]` segment, but every public
 * link the product has ever printed is `amolie.com/{slug}` — a master's page
 * lives in her Instagram bio. Moving it to `/ru/{slug}` breaks those links
 * for a benefit nobody asked for; the language a page renders in is a
 * property of its owner, not of the address.
 *
 * Two independent settings, because they answer to different people: a
 * Latvian master may keep her dashboard in Russian while her clients read the
 * page in Latvian.
 */
export const LOCALES = ['ru', 'lv', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ru';

export const LOCALE_NAMES: Record<Locale, string> = {
  ru: 'Русский',
  lv: 'Latviešu',
  en: 'English',
};

export function resolveLocale(value: string | null | undefined): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}

/**
 * The one case where the setting above does not exist yet: login and
 * registration happen before there is a user row to read a language from, and
 * the locale deliberately stays out of the URL. The browser's own
 * `Accept-Language` is then the only honest source — a Latvian master should
 * not have to sign in through Russian to reach a panel she keeps in Latvian.
 *
 * Quality values are respected (`lv;q=0.9, ru;q=0.4` means Latvian), the tag's
 * region is dropped (`en-GB` is `en`), and anything the product does not speak
 * falls through to Russian rather than to a blank screen.
 */
export function negotiateLocale(
  header: string | null | undefined,
  /**
   * Кабинет падает на русский, лендинг — на английский: у кабинета за спиной
   * уже есть мастер, чей язык известен продукту, а лендинг встречает
   * незнакомого посетителя, и у Латвии с Балтией английский — единственный
   * общий. Умолчание поэтому параметр, а не константа.
   */
  fallback: Locale = DEFAULT_LOCALE,
): Locale {
  if (!header) return fallback;

  const ranked = header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith('q='))
        ?.slice(2);
      const parsed = quality === undefined ? 1 : Number.parseFloat(quality);
      return { tag: tag.trim().toLowerCase(), quality: Number.isNaN(parsed) ? 0 : parsed };
    })
    .filter((entry) => entry.tag.length > 0 && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    const base = tag.split('-')[0] as Locale;
    if (LOCALES.includes(base)) return base;
  }

  return fallback;
}

/** Куки, в которой лендинг помнит язык, выбранный переключателем. */
export const LOCALE_COOKIE = 'amolie_locale';

/**
 * Язык лендинга: сначала явный выбор посетителя, затем язык браузера, затем
 * английский. Выбор бьёт `Accept-Language` — он сделан руками и на этой самой
 * странице, а заголовок лишь догадка о человеке.
 */
export function resolveMarketingLocale(
  cookieValue: string | null | undefined,
  header: string | null | undefined,
): Locale {
  if (LOCALES.includes(cookieValue as Locale)) return cookieValue as Locale;
  return negotiateLocale(header, 'en');
}
