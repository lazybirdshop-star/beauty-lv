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
  byMonth: [],
  byService: [],
};

function show(summary: Partial<FinanceSummary> = {}) {
  return render(<FinanceScreen summary={{ ...EMPTY, ...summary }} t={ru} locale="ru" />);
}

describe('FinanceScreen — доля отмен', () => {
  it('считается от завершившихся, а не от всех записей', () => {
    // 8 завершено, 1 отменена, 1 не пришли → 2 из 10 = 20%.
    show({ completedCount: 8, cancelledCount: 1, noShowCount: 1 });

    expect(screen.getByText('20%')).toBeTruthy();
  });

  it('«не пришли» идут в отмены — для мастера это тот же потерянный час', () => {
    show({ completedCount: 3, cancelledCount: 0, noShowCount: 1 });

    expect(screen.getByText('25%')).toBeTruthy();
  });

  it('без единого завершившегося визита это 0%, а не деление на ноль', () => {
    // Новый кабинет открывается ровно здесь. «NaN%» на первой же карточке —
    // худшее первое впечатление, какое может дать раздел про деньги.
    show();

    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('всё отменено — 100%, а не переполнение', () => {
    show({ completedCount: 0, cancelledCount: 2, noShowCount: 1 });

    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('доля округляется до целого — процент с копейками читать нечем', () => {
    // 1 из 3 = 33.33…%
    show({ completedCount: 2, cancelledCount: 1, noShowCount: 0 });

    expect(screen.getByText('33%')).toBeTruthy();
  });
});

describe('FinanceScreen — деньги', () => {
  it('суммы приходят в копейках и показываются в евро', () => {
    show({ totalRevenue: 46300, averageCheck: 7717 });

    expect(screen.getByText(/463[,.]00/)).toBeTruthy();
    expect(screen.getByText(/77[,.]17/)).toBeTruthy();
  });

  it('ноль показывается нулём, а не прочерком и не пустотой', () => {
    // Пустое место на месте суммы читается как сбой загрузки.
    show();

    expect(screen.getAllByText(/0[,.]00/).length).toBeGreaterThan(0);
  });
});

describe('FinanceScreen — пустота говорит словами', () => {
  it('без завершённых визитов раздел услуг объясняет, почему он пуст', () => {
    show();

    expect(screen.getByText(ru.finance.noCompleted)).toBeTruthy();
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
  it('каждая услуга названа и оценена', () => {
    show({
      completedCount: 3,
      byService: [
        { serviceName: 'Балаяж', revenue: 18000, bookings: 1 },
        { serviceName: 'Стрижка', revenue: 5800, bookings: 2 },
      ],
    });

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText('Балаяж')).toBeTruthy();
    expect(within(rows[0]!).getByText(/180[,.]00/)).toBeTruthy();
    expect(within(rows[1]!).getByText('Стрижка')).toBeTruthy();
  });

  it('порядок берётся с сервера и не переставляется', () => {
    // Сортировка — решение API (по доходу). Второй сортировки быть не должно:
    // две разные могут разойтись, и раздел начнёт спорить сам с собой.
    show({
      byService: [
        { serviceName: 'Первая', revenue: 100, bookings: 1 },
        { serviceName: 'Вторая', revenue: 900, bookings: 1 },
      ],
    });

    const names = screen.getAllByRole('listitem').map((row) => row.textContent);
    expect(names[0]).toContain('Первая');
    expect(names[1]).toContain('Вторая');
  });

  it('нулевой доход не роняет ширину полосы в NaN', () => {
    show({ byService: [{ serviceName: 'Ничего', revenue: 0, bookings: 0 }] });

    const row = screen.getAllByRole('listitem')[0]!;
    const bar = row.querySelector('[style*="width"]') as HTMLElement | null;
    expect(bar?.style.width).toBe('0%');
  });
});

describe('FinanceScreen — график по месяцам', () => {
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
       и зашитая строка проверяла бы сборку Node, а не наш код. Проверяется
       ровно наше: что месяц взят из локали мастера и подписан по-русски. */
    const short = (month: string) =>
      new Intl.DateTimeFormat('ru', { month: 'short' })
        .format(new Date(`${month}-01T00:00:00`))
        .replace('.', '');

    expect(screen.getByText(short('2026-07'))).toBeTruthy();
    expect(screen.getByText(short('2026-08'))).toBeTruthy();
  });

  it('те же числа доступны читалке таблицей, а не только высотой столбика', () => {
    // Высота и цвет не имеют права быть единственным носителем значения.
    show({ byMonth: [{ month: '2026-08', revenue: 20000, bookings: 1 }] });

    const table = screen.getByRole('table', { hidden: true });
    const header = within(table).getByRole('rowheader', { hidden: true });
    expect(header.textContent).toContain('август');
    expect(within(table).getByRole('cell', { hidden: true }).textContent).toMatch(/200[,.]00/);
  });
});
