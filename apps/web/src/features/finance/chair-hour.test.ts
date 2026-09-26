import { describe, expect, it } from 'vitest';

import { chairHourRate } from './chair-hour';

describe('chairHourRate', () => {
  it('делит доход на занятые часы', () => {
    /* 4500 копеек за 90 минут — 3000 за час. */
    expect(chairHourRate(4500, [{ minutes: 90 }])).toBe(3000);
  });

  it('складывает минуты всех визитов', () => {
    expect(chairHourRate(9000, [{ minutes: 60 }, { minutes: 120 }])).toBe(3000);
  });

  it('пустой период не оценивается', () => {
    expect(chairHourRate(0, [])).toBeNull();
    expect(chairHourRate(5000, [])).toBeNull();
  });

  it('визит нулевой длины не делает час бесплатным', () => {
    expect(chairHourRate(5000, [{ minutes: 0 }])).toBeNull();
  });
});
