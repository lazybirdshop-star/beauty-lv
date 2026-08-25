/**
 * Формы слов для сроков хранения — по одной на язык.
 *
 * Живут отдельно от документов: таблицу сроков печатают и политика cookie, и
 * раздел о посетителе в политике конфиденциальности, и вторая копия форм
 * рано или поздно разошлась бы с первой.
 */
import type { LifetimeWords } from '../lifetime';

export const LIFETIME_WORDS_RU: LifetimeWords = {
  persistent: 'до очистки хранилища',
  day: { zero: 'дней', one: 'день', few: 'дня', many: 'дней', other: 'дня' },
  hour: { zero: 'часов', one: 'час', few: 'часа', many: 'часов', other: 'часа' },
  minute: { zero: 'минут', one: 'минута', few: 'минуты', many: 'минут', other: 'минуты' },
};

export const LIFETIME_WORDS_EN: LifetimeWords = {
  persistent: 'until storage is cleared',
  day: { zero: 'days', one: 'day', few: 'days', many: 'days', other: 'days' },
  hour: { zero: 'hours', one: 'hour', few: 'hours', many: 'hours', other: 'hours' },
  minute: { zero: 'minutes', one: 'minute', few: 'minutes', many: 'minutes', other: 'minutes' },
};

/* У латышского нулевая форма своя: 20 dienu, 100 dienu — без «s» на конце. */
export const LIFETIME_WORDS_LV: LifetimeWords = {
  persistent: 'līdz krātuves iztīrīšanai',
  day: { zero: 'dienu', one: 'diena', few: 'dienas', many: 'dienas', other: 'dienas' },
  hour: { zero: 'stundu', one: 'stunda', few: 'stundas', many: 'stundas', other: 'stundas' },
  minute: { zero: 'minūšu', one: 'minūte', few: 'minūtes', many: 'minūtes', other: 'minūtes' },
};
