import { isUserLocale, type UserLocale } from '@amolie/shared-kernel';

/**
 * Язык, на котором продукт обращается к человеку вне интерфейса — в письме и
 * в push.
 *
 * Список языков не переобъявляется: он живёт в shared-kernel как значение
 * колонки `users.locale`, и своя копия здесь разошлась бы с ним на первом же
 * добавленном языке. Задача этого модуля — не перечислить языки, а ответить,
 * что делать со значением, которого в списке нет.
 *
 * Ответ — русский: колонка заполнена всегда, но значение приходит из базы, а
 * не из типа, и уведомление на непонятном языке всё же лучше молчания.
 */
export function resolveNotificationLocale(value: string | null | undefined): UserLocale {
  return isUserLocale(value) ? value : 'ru';
}
