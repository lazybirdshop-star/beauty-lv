import Link from 'next/link';

import type { Messages } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

import { FINANCE_PERIODS, type FinancePeriod } from '../period';

function periodLabel(period: FinancePeriod, t: Messages): string {
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
 * Выглядит как тот же сегментированный контрол, что в календаре и записях —
 * `TabsList` построен на Radix и требует клиентского дерева, поэтому здесь
 * повторена его форма, а не импортирован он сам. `aria-current` несёт то же,
 * что там несёт `data-state=active`.
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
    <nav
      aria-label={t.finance.periodLabel}
      className={cn(
        'flex max-w-full gap-1 self-start overflow-x-auto rounded-full bg-bg-sunken/70 p-1',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      )}
    >
      {FINANCE_PERIODS.map((period) => {
        const isActive = period === current;
        return (
          <Link
            key={period}
            href={`${basePath}?period=${period}`}
            aria-current={isActive ? 'page' : undefined}
            /* `scroll={false}` — смена периода меняет числа на месте, а не
               уводит наверх: мастер, доскроллившая до услуг, хочет увидеть их
               же за другой срок. */
            scroll={false}
            className={cn(
              'press inline-flex min-h-11 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isActive ? 'bg-bg-raised text-ink shadow-soft' : 'text-ink-soft',
            )}
          >
            {periodLabel(period, t)}
          </Link>
        );
      })}
    </nav>
  );
}
