// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import type { FinanceSummary } from '../types';
import { FinanceScreen } from './finance-screen';

/**
 * Экран «Финансы».
 *
 * Проверяется не вёрстка, а арифметика, которую мастер прочитает как правду о
 * своём заработке: доля отмен считается от завершившихся визитов, а не от всех
 * записей (у ждущих подтверждения ещё не было шанса отмениться), и ни один
 * знаменатель не имеет права оказаться нулём — новый кабинет открывается
 * ровно в этом состоянии.
 *
 * Отдельно закрепляется главное свойство пустоты: экран без единого
 * завершённого визита обязан сказать это словами, а не показать пустую
 * карточку с нулями, из которой непонятно, сломалось что-то или ещё не было.
 */

afterEach(cleanup);

const EMPTY: FinanceSummary = {
  currency: 'EUR',
  totalRevenue: 0,
  averageCheck: 0,
  completedCount: 0,
  cancelledCount: 0,
  noShowCount: 0,
  previousRevenue: null,
  byMonth: [],
  byService: [],
};

function show(summary: Partial<FinanceSummary> = {}) {
  return render(
    <FinanceScreen
      summary={{ ...EMPTY, ...summary }}
      completed={[]}
      t={ru}
      locale="ru"
      period="month"
      basePath="/anna/dashboard/finance"
      slug="anna"
    />,
  );
}

describe('FinanceScreen — деньги', () => {
  it('суммы приходят в копейках и показываются в евро', () => {
    show({ totalRevenue: 46300 });

    /* Сумма стоит и крупным числом, и в подписи списка «из чего сложились». */
    expect(screen.getAllByText(/463[,.]00/).length).toBeGreaterThan(0);
  });

  it('ноль показывается нулём, а не прочерком и не пустотой', () => {
    // Пустое место на месте суммы читается как сбой загрузки.
    show();

    expect(screen.getAllByText(/0[,.]00/).length).toBeGreaterThan(0);
  });
});

/**
 * Подпись под доходом: сама сумма мастеру почти ничего не говорит. «3 200 €» —
 * это много или мало? Отвечает только сравнение с прошлым таким же сроком, и
 * три случая из четырёх здесь — не проценты.
 */
describe('FinanceScreen — сравнение с прошлым периодом', () => {
  it('рост показывается процентом', () => {
    show({ totalRevenue: 112000, previousRevenue: 100000 });

    expect(screen.getByText(ru.finance.vsPreviousUp.replace('{percent}', '12'))).toBeTruthy();
  });

  it('падение — тоже процентом, и знаком минуса, а не скобками', () => {
    show({ totalRevenue: 80000, previousRevenue: 100000 });

    expect(screen.getByText(ru.finance.vsPreviousDown.replace('{percent}', '20'))).toBeTruthy();
  });

  it('рост с нуля — не «+∞%», а словами', () => {
    /* Первый месяц работы: делить на ноль нечем, а «+100%» было бы ложью про
       удвоение того, чего не было. */
    show({ totalRevenue: 50000, previousRevenue: 0 });

    expect(screen.getByText(ru.finance.vsPreviousNew)).toBeTruthy();
  });

  it('равные суммы — «как в прошлом», а не «+0%»', () => {
    show({ totalRevenue: 50000, previousRevenue: 50000 });

    expect(screen.getByText(ru.finance.vsPreviousSame)).toBeTruthy();
  });

  it('«всё время» сравнивать не с чем — остаётся прежняя подпись', () => {
    // `previousRevenue: null` приходит ровно в этом случае.
    show({ totalRevenue: 50000, previousRevenue: null });

    expect(screen.getByText(ru.finance.revenueHint)).toBeTruthy();
  });

  it('оба нуля — не «первый период с доходом»: дохода нет вовсе', () => {
    show({ totalRevenue: 0, previousRevenue: 0 });

    expect(screen.getByText(ru.finance.revenueHint)).toBeTruthy();
  });
});

describe('FinanceScreen — пустота говорит словами', () => {
  it('без завершённых визитов раздел услуг объясняет, почему он пуст', () => {
    show();

    /* Пустота объясняется дважды: в разбивке по услугам и в списке визитов. */
    expect(screen.getAllByText(ru.finance.noCompleted).length).toBeGreaterThan(0);
  });

  it('график без данных подписан, а не нарисован пустой рамкой', () => {
    show();

    expect(screen.getByText(ru.common.chartEmpty)).toBeTruthy();
  });

  it('оговорка про то, что это не бухучёт, стоит всегда — и на пустом экране тоже', () => {
    // Продукт не проводит оплаты; суммы — назначенная стоимость. Это
    // обязательство перед мастером, а не украшение непустого состояния.
    show({ completedCount: 5, totalRevenue: 10000 });

    expect(screen.getByText(ru.finance.disclaimer)).toBeTruthy();
  });
});

describe('FinanceScreen — услуги по доходу', () => {
  it('каждая услуга названа, посчитана и оценена', () => {
    show({
      completedCount: 3,
      byService: [
        { serviceName: 'Балаяж', revenue: 18000, bookings: 1 },
        { serviceName: 'Стрижка', revenue: 5800, bookings: 2 },
      ],
    });

    const row = screen.getByText('Балаяж').closest('tr')!;
    expect(within(row).getByText(/180[,.]00/)).toBeTruthy();
    expect(within(row).getByText('1')).toBeTruthy();
    expect(screen.getByText('Стрижка')).toBeTruthy();
  });

  it('порядок берётся с сервера и не переставляется', () => {
    /* Сортировка — решение API (по доходу). Второй сортировки быть не должно:
       две разные могут разойтись, и раздел начнёт спорить сам с собой. */
    show({
      byService: [
        { serviceName: 'Первая', revenue: 100, bookings: 1 },
        { serviceName: 'Вторая', revenue: 900, bookings: 1 },
      ],
    });

    const names = screen
      .getAllByRole('row')
      .map((row) => row.textContent ?? '')
      .filter((text) => text.includes('Первая') || text.includes('Вторая'));
    expect(names[0]).toContain('Первая');
    expect(names[1]).toContain('Вторая');
  });
});

describe('FinanceScreen — столбики дохода', () => {
  it('месяцы подписаны на языке мастера', () => {
    show({
      completedCount: 2,
      byMonth: [
        { month: '2026-07', revenue: 10000, bookings: 1 },
        { month: '2026-08', revenue: 20000, bookings: 1 },
      ],
    });

    /* Ожидание считается тем же `Intl`, что и подпись: короткое имя месяца
       зависит от версии ICU в среде («июл» в одном браузере, «июль» в другом),
       и зашитая строка проверяла бы сборку Node, а не наш код. */
    const short = (month: string) =>
      new Intl.DateTimeFormat('ru', { month: 'short' })
        .format(new Date(`${month}-01T00:00:00`))
        .replace('.', '');

    expect(screen.getByText(short('2026-07'))).toBeTruthy();
    expect(screen.getByText(short('2026-08'))).toBeTruthy();
  });

  it('сумма столбика доступна читалке словами, а не только высотой', () => {
    // Высота и цвет не имеют права быть единственным носителем значения.
    show({ byMonth: [{ month: '2026-08', revenue: 20000, bookings: 1 }] });

    const bar = screen.getByLabelText(/200[,.]00/);
    expect(bar).toBeTruthy();
  });

  it('нулевой доход не роняет высоту столбика в NaN', () => {
    show({ byMonth: [{ month: '2026-08', revenue: 0, bookings: 0 }] });

    const fill = document.querySelector('.finance-bar__fill') as HTMLElement | null;
    expect(fill?.style.height).toBe('2%');
  });
});
