'use client';

import { formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

import type { CalendarSummary as Summary } from '../calendar-summary';

/**
 * Четыре плитки сводки над сеткой дня — прототип «Кабинет 2026»,
 * `.cal-summary` (правка v5): один материал на все четыре, акцент — только у
 * главной цифры. Ждущие ответа — янтарём, пока они есть; ожидаемый доход —
 * розовыми чернилами.
 *
 * Список определений, а не четыре абзаца: читалка называет пару «подпись —
 * число», а не бросает голое «3».
 */
export function CalendarSummary({
  summary,
  today = false,
}: {
  summary: Summary;
  /** Нарисован сегодняшний день — «Записей сегодня», как в прототипе. */
  today?: boolean;
}) {
  const t = useT();
  const locale = useLocale();

  const income = summary.income.length
    ? summary.income.map(([currency, amount]) => formatPrice(amount, currency, locale)).join(' + ')
    : '—';

  const tiles: { key: string; label: string; value: string; tone?: 'wait' | 'income' }[] = [
    {
      key: 'bookings',
      label: today ? t.schedule.summaryBookingsToday : t.schedule.summaryBookings,
      value: String(summary.bookings),
    },
    /* Охват — в подписи, а не в голове у читающего. Плитки считают ровно
       нарисованный день, а «Нужен ответ 16» на главной — все записи вообще;
       два числа под одним словом читались как противоречие продукта себе. */
    {
      key: 'pending',
      label: today ? t.schedule.summaryPendingToday : t.schedule.summaryPending,
      value: String(summary.pending),
      tone: summary.pending > 0 ? 'wait' : undefined,
    },
    {
      key: 'free',
      label: today ? t.schedule.summaryFreeToday : t.schedule.summaryFree,
      value: String(summary.free),
    },
    { key: 'income', label: t.schedule.summaryIncome, value: income, tone: 'income' },
  ];

  return (
    <dl className="cal-summary" aria-label={t.schedule.summaryLabel}>
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className={
            tile.tone ? `cal-summary__tile cal-summary__tile--${tile.tone}` : 'cal-summary__tile'
          }
        >
          <dt className="cal-summary__label">{tile.label}</dt>
          <dd className="cal-summary__value tnum" title={tile.value}>
            {tile.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
