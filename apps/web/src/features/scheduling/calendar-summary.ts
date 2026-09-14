import type { Booking } from '@/features/bookings/types';

import type { CalendarEntry, GridColumn } from './calendar-columns';
import { minutesOfDay } from './calendar-model';
import type { PublishedSlot } from './types';

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

/**
 * Окно можно продать: оно открыто, не скрыто и не накрыто визитом того же
 * человека в этой колонке — в окно, куда уже вписан длинный визит, никого не
 * записать. Одно правило на сводку и на повестку дня.
 */
export function isSlotOpen(
  slot: PublishedSlot,
  entries: readonly CalendarEntry[],
  columnKey: string,
  timeZone: string,
): boolean {
  if (slot.status !== 'available' || slot.hiddenAt) return false;
  const at = minutesOfDay(slot.startsAt, timeZone);
  return !entries.some(
    (entry) =>
      entry.columnKey === columnKey &&
      entry.memberId === slot.organizationMemberId &&
      at >= entry.at &&
      at < entry.at + entry.minutes,
  );
}

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

  const free = columns.reduce(
    (count, column) =>
      count + column.slots.filter((slot) => isSlotOpen(slot, visible, column.key, timeZone)).length,
    0,
  );

  return {
    bookings: visible.length,
    pending: visible.filter((entry) => entry.pending).length,
    free,
    income: [...income],
  };
}
