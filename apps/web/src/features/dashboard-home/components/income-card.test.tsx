// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { IncomeCard } from './income-card';

afterEach(cleanup);

describe('IncomeCard', () => {
  it('рисует линию дохода, когда точек хотя бы две', () => {
    const { container } = render(
      <IncomeCard
        label="доход сегодня"
        value="286,00 €"
        trend={[100, 240, 180, 320]}
        trendLabel="Доход по месяцам"
      />,
    );

    const spark = container.querySelector('.income-card__spark');
    expect(spark).not.toBeNull();
    /* Четыре точки на ломаной — по одной на месяц. */
    expect(spark?.querySelector('polyline')?.getAttribute('points')?.split(' ')).toHaveLength(4);
    expect(screen.getByRole('img', { name: 'Доход по месяцам' })).toBeTruthy();
  });

  it('одну точку не рисует: линии из одного месяца не бывает', () => {
    const { container } = render(
      <IncomeCard label="доход сегодня" value="42,00 €" trend={[100]} />,
    );

    expect(container.querySelector('.income-card__spark')).toBeNull();
  });

  it('без ряда карточка остаётся прежней', () => {
    const { container } = render(
      <IncomeCard label="доход сегодня" value="0,00 €" hint="сделано 0 из 3" />,
    );

    expect(container.querySelector('.income-card__spark')).toBeNull();
    expect(screen.getByText('сделано 0 из 3')).toBeTruthy();
  });
});
