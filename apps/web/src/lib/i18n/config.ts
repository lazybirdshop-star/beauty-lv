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
