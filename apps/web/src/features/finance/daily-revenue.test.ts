import { describe, expect, it } from 'vitest';

import { monthDays } from './daily-revenue';

describe('monthDays', () => {
  it('столько дней, сколько в месяце, — и в феврале високосного года', () => {
    expect(monthDays('2026-09-12', [])).toHaveLength(30);
    expect(monthDays('2026-10-01', [])).toHaveLength(31);
    expect(monthDays('2028-02-01', [])).toHaveLength(29);
  });

  it('визиты одного дня складываются, чужой месяц не попадает', () => {
    const days = monthDays('2026-09-12', [
      { dateKey: '2026-09-03', amount: 3000 },
      { dateKey: '2026-09-03', amount: 2000 },
      { dateKey: '2026-08-31', amount: 9000 },
    ]);

    expect(days[2]!.revenue).toBe(5000);
    expect(days.reduce((sum, day) => sum + day.revenue, 0)).toBe(5000);
  });

  it('сегодня отмечено, дни после него — будущие, а не нулевые', () => {
    const days = monthDays('2026-09-12', []);

    expect(days[11]).toMatchObject({ day: 12, isToday: true, isFuture: false });
    expect(days[12]).toMatchObject({ day: 13, isToday: false, isFuture: true });
    expect(days[0]!.isFuture).toBe(false);
  });
});
