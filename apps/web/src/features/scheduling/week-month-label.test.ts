import { describe, expect, it } from 'vitest';

import { buildWeek, weekMonthLabel } from './week';

const TZ = 'Europe/Riga';

describe('weekMonthLabel', () => {
  it('называет месяц ленты дней — его не было видно нигде на телефоне', () => {
    const days = buildWeek('2026-09-24', [], 'ru', TZ);
    expect(weekMonthLabel(days, 'ru', TZ, '2026')).toBe('сентябрь');
  });

  it('называет оба месяца, когда неделя лежит на стыке', () => {
    const days = buildWeek('2026-09-30', [], 'ru', TZ);
    expect(weekMonthLabel(days, 'ru', TZ, '2026')).toBe('сентябрь — октябрь');
  });

  it('добавляет год, только когда неделя ушла из текущего', () => {
    const days = buildWeek('2027-03-10', [], 'ru', TZ);
    expect(weekMonthLabel(days, 'ru', TZ, '2026')).toBe('март 2027');
    expect(weekMonthLabel(days, 'ru', TZ, '2027')).toBe('март');
  });

  it('пустую неделю не подписывает', () => {
    expect(weekMonthLabel([], 'ru', TZ, '2026')).toBe('');
  });
});
