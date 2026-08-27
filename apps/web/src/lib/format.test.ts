import { describe, expect, it } from 'vitest';

import {
  formatCivilDay,
  formatDateTime,
  formatDuration,
  formatPhone,
  formatTime,
  timeKey,
} from './format';

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

/**
 * Телефон при выводе (FIX.md F-35).
 *
 * Хранится он канонически — все разделители сняты, иначе один человек
 * становится двумя строками в адресной книге, — и печатался ровно так, как
 * хранится: `+37120000425` рядом с `+371 20 000 090`.
 */
describe('formatPhone', () => {
  it('латвийский номер разбивается на группы', () => {
    expect(formatPhone('+37120000425')).toBe('+371 20 000 425');
  });

  it('уже разбитый номер приводится к тому же виду', () => {
    expect(formatPhone('+371 20 000 090')).toBe('+371 20 000 090');
  });

  it('чужой код страны не трогается', () => {
    // Разбить номер, не зная длины его кода страны, значит расставить пробелы
    // наугад — а неверно разбитый номер читается хуже, чем неразбитый.
    expect(formatPhone('+4915112345678')).toBe('+4915112345678');
  });

  it('номер без кода страны остаётся как есть', () => {
    expect(formatPhone('20000425')).toBe('20000425');
  });

  it('латвийский номер неверной длины не выдумывается', () => {
    expect(formatPhone('+3712000042')).toBe('+3712000042');
  });

  it('пустое значение — пустая строка, а не «null»', () => {
    expect(formatPhone(null)).toBe('');
    expect(formatPhone(undefined)).toBe('');
    expect(formatPhone('')).toBe('');
  });
});

describe('timeKey', () => {
  /* Момент один, часов у него столько же, сколько поясов; расписание называет
     час салона. Проверка идёт двумя чужими друг другу поясами, поэтому она
     ничего не должна поясу прогона. */
  it('час момента — в заданном поясе', () => {
    const instant = '2026-02-12T01:00:00Z';
    expect(timeKey(instant, 'Asia/Tokyo')).toBe('10:00');
    expect(timeKey(instant, 'Europe/Riga')).toBe('03:00');
    expect(timeKey(instant, 'UTC')).toBe('01:00');
  });

  it('цифры латинские при любой локали интерфейса — это данные, а не подпись', () => {
    expect(timeKey('2026-02-12T22:30:00Z', 'UTC')).toBe('22:30');
  });
});

describe('formatCivilDay', () => {
  /* Дата уже посчитана в поясе салона и переводу не подлежит: подпись обязана
     назвать ровно тот день, что стоит в строке, в любом поясе читателя. */
  it('называет день строки, не сдвигая его', () => {
    expect(formatCivilDay('2026-08-28', 'ru')).toBe('пятница, 28 августа');
  });
});
