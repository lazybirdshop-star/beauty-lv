import Link from 'next/link';

import type { Messages } from '@/lib/i18n/messages';

import { FINANCE_PERIODS, type FinancePeriod } from '../period';

export function periodLabel(period: FinancePeriod, t: Messages): string {
  switch (period) {
    case 'month':
      return t.finance.periodMonth;
    case 'quarter':
      return t.finance.periodQuarter;
    case 'year':
      return t.finance.periodYear;
    case 'all':
      return t.finance.periodAll;
  }
}

/**
 * За какой срок мастер смотрит деньги.
 *
 * Ссылки, а не вкладки с состоянием, и это следствие того, что экран
 * серверный: период — часть адреса, поэтому каждая цифра на экране приходит
 * уже посчитанной за нужный срок, «назад» возвращает к прошлому выбору, а
 * ссылку на «год» можно сохранить в закладки. Вкладка на состоянии заставила
 * бы либо тащить весь экран в клиент, либо считать периоды дважды.
 *
 * Выглядит как сегмент прототипа «Кабинет 2026» (`.seg`) — тот же, что у
 * вкладок календаря и записей. `TabsList` построен на Radix и требует
 * клиентского дерева, поэтому здесь повторена его форма, а не импортирован
 * он сам. `aria-current` несёт то же, что там несёт `data-state=active`.
 */
export function PeriodSwitch({
  basePath,
  current,
  t,
}: {
  basePath: string;
  current: FinancePeriod;
  t: Messages;
}) {
  return (
    <nav aria-label={t.finance.periodLabel} className="seg-pills">
      {FINANCE_PERIODS.map((period) => (
        <Link
          key={period}
          href={`${basePath}?period=${period}`}
          aria-current={period === current ? 'page' : undefined}
          /* `scroll={false}` — смена периода меняет числа на месте, а не
             уводит наверх: мастер, доскроллившая до услуг, хочет увидеть их
             же за другой срок. */
          scroll={false}
        >
          {periodLabel(period, t)}
        </Link>
      ))}
    </nav>
  );
}
