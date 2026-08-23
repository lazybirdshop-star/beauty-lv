// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BarChart, type BarChartPoint } from './bar-chart';

/**
 * Односерийные столбики кабинета.
 *
 * Проверяется то, чем график отвечает за правду о числах: высота обязана быть
 * пропорциональна значению, ноль обязан остаться нулём (а не превратиться в
 * минимальную полоску, которая читается как «немного»), пустой набор обязан
 * сказать словами, что данных нет, и те же числа обязаны существовать для
 * читалки — высота и цвет не имеют права быть единственным носителем значения.
 */

afterEach(cleanup);

const money = (value: number) => `${(value / 100).toFixed(2)} €`;

function point(label: string, value: number): BarChartPoint {
  return { label, value, title: `${label} 2026` };
}

function show(data: BarChartPoint[]) {
  return render(
    <BarChart
      data={data}
      formatValue={money}
      caption="Доход за месяц"
      emptyLabel="Пока нет данных"
    />,
  );
}

/** Высоты столбиков в порядке отрисовки. */
function barHeights(container: HTMLElement): number[] {
  return [...container.querySelectorAll('span[style*="height"]')].map((node) =>
    Number.parseFloat((node as HTMLElement).style.height),
  );
}

describe('BarChart — пустота', () => {
  it('пустой набор — подпись словами, а не пустая рамка', () => {
    show([]);

    expect(screen.getByText('Пока нет данных')).toBeTruthy();
    expect(screen.queryByRole('figure')).toBeNull();
  });

  it('все нули — тоже пустота: рисовать нечего, и график этого не скрывает', () => {
    // Ряд нулевых столбиков высотой в пиксель выглядел бы как данные.
    show([point('июл', 0), point('авг', 0)]);

    expect(screen.getByText('Пока нет данных')).toBeTruthy();
  });
});

describe('BarChart — высота пропорциональна значению', () => {
  it('половина максимума занимает половину высоты', () => {
    const { container } = show([point('июл', 5000), point('авг', 10000)]);

    const [july, august] = barHeights(container);
    expect(august).toBeGreaterThan(0);
    expect(july).toBeCloseTo(august! / 2, 5);
  });

  it('ноль рядом с непустыми месяцами остаётся нулевой высотой', () => {
    // Минимальная полоска нужна крошечному, но не нулевому значению: месяц без
    // дохода обязан выглядеть как месяц без дохода.
    const { container } = show([point('июл', 0), point('авг', 10000)]);

    expect(barHeights(container)[0]).toBe(0);
  });

  it('крошечное значение всё же видно — иначе месяц выпадает из ряда', () => {
    const { container } = show([point('июл', 1), point('авг', 1000000)]);

    expect(barHeights(container)[0]).toBeGreaterThanOrEqual(3);
  });
});

describe('BarChart — что читает читалка', () => {
  it('те же числа лежат таблицей рядом с картинкой', () => {
    show([point('июл', 5000), point('авг', 10000)]);

    const table = screen.getByRole('table', { hidden: true });
    const headers = within(table)
      .getAllByRole('rowheader', { hidden: true })
      .map((cell) => cell.textContent);
    const values = within(table)
      .getAllByRole('cell', { hidden: true })
      .map((cell) => cell.textContent);

    expect(headers).toEqual(['июл 2026', 'авг 2026']);
    expect(values).toEqual(['50.00 €', '100.00 €']);
  });

  it('таблица подписана тем же, чем подписан график', () => {
    show([point('авг', 10000)]);

    expect(
      within(screen.getByRole('table', { hidden: true })).getByText('Доход за месяц'),
    ).toBeTruthy();
    expect(screen.getAllByText('Доход за месяц').length).toBe(2);
  });

  it('столбики не забирают себе табуляцию — за ними нет действия', () => {
    // Дюжина остановок фокуса без единого действия — шум для клавиатуры;
    // настоящий путь для вспомогательной техники здесь таблица.
    const { container } = show([point('июл', 5000), point('авг', 10000)]);

    expect(container.querySelectorAll('button, [tabindex]')).toHaveLength(0);
  });
});

describe('BarChart — подписи оси', () => {
  it('под каждым столбиком стоит его короткая подпись', () => {
    show([point('июл', 5000), point('авг', 10000)]);

    expect(screen.getByText('июл')).toBeTruthy();
    expect(screen.getByText('авг')).toBeTruthy();
  });

  it('два месяца с одинаковой подписью не роняют список ключами', () => {
    // Ключ собран из label + title; одинаковый label из разных лет — реальный
    // случай для графика за 13 месяцев.
    const { container } = show([
      { label: 'авг', value: 100, title: 'август 2025' },
      { label: 'авг', value: 200, title: 'август 2026' },
    ]);

    expect(barHeights(container)).toHaveLength(2);
  });
});
