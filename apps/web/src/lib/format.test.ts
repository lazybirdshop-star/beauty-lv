import { describe, expect, it } from 'vitest';

import { formatDateTime, formatDuration, formatTime } from './format';

/**
 * Час — данные расписания, а не языковая привычка.
 *
 * `Intl` выбирает цикл по локали и в английской пишет «03:00 PM». В списке,
 * где рядом стоят окна мастера, это читается как другое время, поэтому цикл
 * задан явно и одинаково во всех языках интерфейса. Дата при этом остаётся
 * на языке мастера — порядок дня и месяца языку и принадлежит.
 */

/* Локальное время, а не UTC: так проверка не зависит от TZ прогона. */
const AT_15_05 = new Date(2026, 7, 13, 15, 5);
const AT_MIDNIGHT = new Date(2026, 7, 13, 0, 0);

describe('formatTime', () => {
  it('пишет 24-часовой час во всех языках интерфейса', () => {
    for (const locale of ['ru', 'lv', 'en']) {
      expect(formatTime(AT_15_05, locale), locale).toBe('15:05');
    }
  });

  it('не оставляет AM/PM даже там, где локаль их просит', () => {
    expect(formatTime(AT_15_05, 'en-US')).not.toMatch(/[AP]M/i);
  });

  /* `hour12: false` в части сред отдаёт полночь как «24:00» — цикл `h23`
     существует именно ради этой строки. */
  it('полночь — это 00, а не 24', () => {
    for (const locale of ['ru', 'lv', 'en']) {
      expect(formatTime(AT_MIDNIGHT, locale), locale).toBe('00:00');
    }
  });

  it('принимает и строку ISO, и Date', () => {
    expect(formatTime(AT_15_05.toISOString(), 'ru')).toBe(formatTime(AT_15_05, 'ru'));
  });
});

describe('formatDateTime', () => {
  it('держит час 24-часовым, а дату — на языке мастера', () => {
    for (const locale of ['ru', 'lv', 'en']) {
      const formatted = formatDateTime(AT_15_05, locale);
      expect(formatted, locale).toContain('15:05');
      expect(formatted, locale).not.toMatch(/[AP]M/i);
    }
  });

  it('датную часть задаёт вызывающий, часовую — нет', () => {
    const withWeekday = formatDateTime(AT_15_05, 'ru', {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
    });
    expect(withWeekday).toContain('15:05');
    expect(withWeekday).toContain('августа');
  });
});

/**
 * Длительность визита — один форматтер на продукт (FIX.md F-18).
 *
 * Шторка записи говорила «1 ч 15 мин», а страница статуса и кабинет клиента
 * печатали «75 мин» и «195 мин»: одна и та же запись читалась по-разному на
 * соседних экранах. Тесты переехали сюда вместе с функцией из движка
 * публичной страницы — спрашивают её теперь трое, а не один.
 */
describe('formatDuration', () => {
  it('до часа — только минуты', () => {
    expect(formatDuration(45)).toBe('45 мин');
  });

  it('ровный час — без остатка минут', () => {
    expect(formatDuration(60)).toBe('1 ч');
    expect(formatDuration(120)).toBe('2 ч');
  });

  it('часы с остатком', () => {
    expect(formatDuration(75)).toBe('1 ч 15 мин');
    expect(formatDuration(150)).toBe('2 ч 30 мин');
  });

  it('длинный визит читается часами, а не тремя сотнями минут', () => {
    // Ровно тот случай, ради которого форматтер стал одним на продукт:
    // «195 мин» человек всё равно переводит в часы в уме.
    expect(formatDuration(195)).toBe('3 ч 15 мин');
  });

  it('ноль минут', () => {
    expect(formatDuration(0)).toBe('0 мин');
  });

  it('единицы берутся из словаря, когда он передан', () => {
    const units = { hoursShort: 'h', minutesShort: 'min' };
    expect(formatDuration(45, units)).toBe('45 min');
    expect(formatDuration(60, units)).toBe('1 h');
    expect(formatDuration(90, units)).toBe('1 h 30 min');
  });
});
