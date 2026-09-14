import { describe, expect, it } from 'vitest';

import type { Booking } from '@/features/bookings/types';

import type { CalendarEntry, GridColumn } from './calendar-columns';
import { calendarSummary } from './calendar-summary';
import type { PublishedSlot } from './types';

const TZ = 'Europe/Riga';

function entry(
  id: string,
  at: number,
  status: Booking['status'] = 'confirmed',
  overrides: Partial<CalendarEntry> = {},
  price: { amount: number; currency: string } = { amount: 4500, currency: 'EUR' },
): CalendarEntry {
  return {
    id,
    booking: {
      id,
      status,
      items: [{ priceAmountSnapshot: price.amount, priceCurrencySnapshot: price.currency }],
    } as unknown as Booking,
    memberId: 'anna',
    at,
    minutes: 60,
    columnKey: '2026-09-14',
    dateKey: '2026-09-14',
    clientName: 'Maria',
    serviceName: 'Manicure',
    tone: 'var(--service-rose)',
    memberTone: 1,
    pending: status === 'pending',
    ...overrides,
  };
}

function slot(startsAt: string, overrides: Partial<PublishedSlot> = {}): PublishedSlot {
  return {
    id: startsAt,
    organizationMemberId: 'anna',
    startsAt,
    status: 'available',
    hiddenAt: null,
    ...overrides,
  } as PublishedSlot;
}

function column(slots: PublishedSlot[], key = '2026-09-14'): GridColumn {
  return {
    key,
    dateKey: '2026-09-14',
    title: 'пн',
    subtitle: '14',
    highlight: true,
    slots,
    memberId: 'anna',
  } as GridColumn;
}

describe('calendarSummary', () => {
  it('считает записи и ждущие ответа среди показанных', () => {
    const summary = calendarSummary(
      [entry('a', 600), entry('b', 720, 'pending'), entry('c', 840, 'completed')],
      [column([])],
      TZ,
    );

    expect(summary.bookings).toBe(3);
    expect(summary.pending).toBe(1);
  });

  it('доход — без ждущих и неявок, по валютам отдельно', () => {
    const summary = calendarSummary(
      [
        entry('a', 600),
        entry('b', 720, 'pending'),
        entry('c', 840, 'no_show'),
        entry('d', 900, 'completed', {}, { amount: 3000, currency: 'EUR' }),
        entry('e', 960, 'confirmed', {}, { amount: 2000, currency: 'USD' }),
      ],
      [column([])],
      TZ,
    );

    expect(summary.income).toEqual([
      ['EUR', 7500],
      ['USD', 2000],
    ]);
  });

  it('свободное окно — открытое, не скрытое и не накрытое визитом', () => {
    const summary = calendarSummary(
      /* Визит 10:00–11:00 накрывает окна 10:00 и 10:30. */
      [entry('a', 600)],
      [
        column([
          slot('2026-09-14T10:00:00+03:00'),
          slot('2026-09-14T10:30:00+03:00'),
          slot('2026-09-14T12:00:00+03:00'),
          slot('2026-09-14T13:00:00+03:00', { hiddenAt: '2026-09-13T09:00:00Z' }),
          slot('2026-09-14T14:00:00+03:00', { status: 'booked' }),
        ]),
      ],
      TZ,
    );

    expect(summary.free).toBe(1);
  });

  it('визит чужой колонки ни числа, ни окна не трогает', () => {
    const summary = calendarSummary(
      [entry('a', 600, 'confirmed', { columnKey: 'somewhere-else' })],
      [column([slot('2026-09-14T10:00:00+03:00')])],
      TZ,
    );

    expect(summary.bookings).toBe(0);
    expect(summary.income).toEqual([]);
    expect(summary.free).toBe(1);
  });
});
