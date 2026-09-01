import type { UserLocale } from '@amolie/shared-kernel';

/**
 * Как называется время визита в письме.
 *
 * Считается в поясе салона, а не сервера: визит в 10:00 у рижского мастера —
 * это 10:00 в письме, каким бы ни был часовой пояс машины, которая письмо
 * собрала. Пояс приходит из организации (`organizations.timezone`), и это
 * единственно верный источник: клиент придёт туда, где стоит кресло.
 */
const INTL_LOCALES: Record<UserLocale, string> = {
  ru: 'ru-RU',
  lv: 'lv-LV',
  en: 'en-GB',
};

export function formatVisitTime(startsAt: Date, locale: UserLocale, timeZone: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(startsAt);
}
