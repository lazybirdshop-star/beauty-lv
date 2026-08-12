/**
 * Языки продукта.
 *
 * Живут здесь, а не в словарях веба: это значение колонки `users.locale` и
 * `organizations.default_locale`, то есть предметный факт, который сервер
 * проверяет при регистрации, а письма читают, выбирая язык. Два списка —
 * один в вебе, другой в API — разошлись бы на первом же добавленном языке.
 */
export const USER_LOCALES = ['ru', 'lv', 'en'] as const;

export type UserLocale = (typeof USER_LOCALES)[number];

export function isUserLocale(value: unknown): value is UserLocale {
  return typeof value === 'string' && (USER_LOCALES as readonly string[]).includes(value);
}
