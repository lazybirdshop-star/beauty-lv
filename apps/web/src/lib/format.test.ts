import { describe, expect, it } from 'vitest';

import { formatDateTime, formatTime } from './format';

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
