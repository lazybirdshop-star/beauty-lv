import type { Booking } from '@/features/bookings/types';

import type { CalendarEntry, GridColumn } from './calendar-columns';
import { minutesOfDay } from './calendar-model';

/**
 * Сводка показанного дня — четыре плитки над сеткой (прототип «Кабинет 2026»,
 * `.cal-summary`): сколько записей, сколько ждут ответа, сколько окон ещё
 * можно продать и какой доход день обещает.
 *
 * Считает ровно то, что нарисовано: визиты и окна колонок на экране. Иначе
 * число над сеткой спорило бы с самой сеткой — «4 записи» над тремя блоками.
 */
export interface CalendarSummary {
  bookings: number;
  pending: number;
  free: number;
  /** Ожидаемый доход по валютам: валюта и сумма в минимальных единицах. */
  income: [currency: string, amount: number][];
}

/**
 * Что дохода не принесёт: ждущая ещё не согласована, неявка уже не
 * состоялась. Отменённое и истёкшее в сетку не попадает вовсе, но и здесь
 * названо — функция не обязана знать, кто и как отобрал записи.
 */
const NOT_EARNING = new Set<Booking['status']>([
  'pending',
  'no_show',
  'cancelled_by_client',
  'cancelled_by_master',
  'expired',
]);

export function calendarSummary(
  entries: readonly CalendarEntry[],
  columns: readonly GridColumn[],
  timeZone: string,
): CalendarSummary {
  const shown = new Set(columns.map((column) => column.key));
  const visible = entries.filter((entry) => shown.has(entry.columnKey));

  const income = new Map<string, number>();
  for (const entry of visible) {
    if (NOT_EARNING.has(entry.booking.status)) continue;
    for (const item of entry.booking.items) {
      income.set(
        item.priceCurrencySnapshot,
        (income.get(item.priceCurrencySnapshot) ?? 0) + item.priceAmountSnapshot,
      );
    }
  }

  /* Свободное окно — открытое, не скрытое и не накрытое визитом того же
     человека: окно, в которое уже вписан длинный визит, продать нельзя. */
  let free = 0;
  for (const column of columns) {
    for (const slot of column.slots) {
      if (slot.status !== 'available' || slot.hiddenAt) continue;
      const at = minutesOfDay(slot.startsAt, timeZone);
      const covered = visible.some(
        (entry) =>
          entry.columnKey === column.key &&
          entry.memberId === slot.organizationMemberId &&
          at >= entry.at &&
          at < entry.at + entry.minutes,
      );
      if (!covered) free += 1;
    }
  }

  return {
    bookings: visible.length,
    pending: visible.filter((entry) => entry.pending).length,
    free,
    income: [...income],
  };
}
