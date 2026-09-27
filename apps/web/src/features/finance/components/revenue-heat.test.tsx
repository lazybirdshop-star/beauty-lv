// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { DayRevenue } from '../daily-revenue';
import { RevenueHeat } from './revenue-heat';

/**
 * Ось дохода по дням.
 *
 * Подпись «сегодня» стоит под своим столбиком, а у края месяца садится на
 * подпись крайнего дня: 27-е из 30 давало на экране «сегодня, 2730 сен».
 * Проверяется не вёрстка, а читаемость подписи: две даты не имеют права
 * оказаться одним словом.
 */
afterEach(cleanup);

const month = (todayDay: number, length = 30): DayRevenue[] =>
  Array.from({ length }, (_, index) => ({
    key: `2026-09-${String(index + 1).padStart(2, '0')}`,
    day: index + 1,
    revenue: 1000,
    isToday: index + 1 === todayDay,
    isFuture: index + 1 > todayDay,
  }));

const show = (todayDay: number) =>
  render(
    <RevenueHeat
      days={month(todayDay)}
      titles={month(todayDay).map((day) => day.key)}
      label="Доход по дням"
      caption={['1 сен', `сегодня, ${todayDay}`, '30 сен']}
    />,
  );

const caption = () => screen.getByRole('figure').querySelector('figcaption')!.textContent ?? '';

describe('RevenueHeat', () => {
  it('в середине месяца называет оба края', () => {
    show(15);

    expect(caption()).toContain('1 сен');
    expect(caption()).toContain('30 сен');
  });

  it('у конца месяца край уступает место «сегодня»', () => {
    show(27);

    expect(caption()).toContain('сегодня, 27');
    expect(caption()).not.toContain('30 сен');
  });

  it('в начале месяца место уступает первый день', () => {
    show(2);

    expect(caption()).toContain('сегодня, 2');
    expect(caption()).not.toContain('1 сен');
    expect(caption()).toContain('30 сен');
  });
});
