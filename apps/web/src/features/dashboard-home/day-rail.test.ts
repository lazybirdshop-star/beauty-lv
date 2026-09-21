import { describe, expect, it } from 'vitest';

import type { Booking } from '@/features/bookings/types';
import type { OpenInterval } from '@/features/scheduling/open-intervals';

import { dayRailModel } from './day-rail';

const TZ = 'Europe/Riga';

function booking(startsAt: string, minutes: number, over: Partial<Booking> = {}): Booking {
  return {
    id: `b-${startsAt}`,
    organizationId: 'o',
    organizationMemberId: 'm',
    publishedSlotId: 's',
    clientUserId: null,
    guestName: 'Инесе',
    guestPhone: null,
    guestEmail: null,
    guestInstagram: null,
    status: 'confirmed',
    cancellationReason: null,
    source: 'admin_manual',
    notes: null,
    startsAt,
    items: [
      {
        id: 'i',
        bookingId: 'b',
        serviceId: 'sv',
        serviceNameSnapshot: 'Маникюр',
        durationMinutesSnapshot: minutes,
        priceAmountSnapshot: 4500,
        priceCurrencySnapshot: 'EUR',
      },
    ],
    createdAt: startsAt,
    updatedAt: startsAt,
    ...over,
  };
}

const interval = (startsAt: string, endsAt: string): OpenInterval => ({
  memberId: 'm',
  startsAt,
  endsAt,
  minutes: (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000,
});

describe('dayRailModel', () => {
  it('пустой день линейки не рисует', () => {
    expect(dayRailModel([], [], new Date('2026-09-13T10:00:00Z'), TZ)).toBeNull();
  });

  it('визит и окно ложатся отрезками, сумма долей не выходит за шкалу', () => {
    const rail = dayRailModel(
      [booking('2026-09-13T07:00:00Z', 60)],
      [interval('2026-09-13T09:00:00Z', '2026-09-13T10:00:00Z')],
      new Date('2026-09-13T08:00:00Z'),
      TZ,
    );
    expect(rail).not.toBeNull();
    expect(rail!.segments).toHaveLength(2);
    for (const segment of rail!.segments) {
      expect(segment.left).toBeGreaterThanOrEqual(0);
      expect(segment.left + segment.width).toBeLessThanOrEqual(100.001);
    }
  });

  it('короткий день не растягивается: окно суток не уже восьми часов', () => {
    const rail = dayRailModel(
      [booking('2026-09-13T07:00:00Z', 30), booking('2026-09-13T08:00:00Z', 30)],
      [],
      new Date('2026-09-13T07:30:00Z'),
      TZ,
    );
    expect(rail!.to - rail!.from).toBeGreaterThanOrEqual(8 * 3_600_000);
  });

  it('«сейчас» вне окна суток не показывается', () => {
    const rail = dayRailModel(
      [booking('2026-09-13T07:00:00Z', 60)],
      [],
      new Date('2026-09-14T22:00:00Z'),
      TZ,
    );
    expect(rail!.now).toBeNull();
  });

  it('завершённый визит помечен, чтобы линейка его гасила', () => {
    const rail = dayRailModel(
      [booking('2026-09-13T07:00:00Z', 60, { status: 'completed' })],
      [],
      new Date('2026-09-13T09:00:00Z'),
      TZ,
    );
    expect(rail!.segments[0]!.done).toBe(true);
  });
});

describe('dayRailModel — салон дорожками', () => {
  it('кладёт визиты каждого мастера на его дорожку и отбрасывает тех, у кого её нет', () => {
    const anna = booking('2026-09-17T09:00:00Z', 60, { id: 'a', organizationMemberId: 'anna' });
    const julia = booking('2026-09-17T09:00:00Z', 60, { id: 'j', organizationMemberId: 'julia' });
    const stranger = booking('2026-09-17T12:00:00Z', 60, { id: 's', organizationMemberId: 'x' });
    const lanes = { anna: 0, julia: 1 } as Record<string, number>;
    const rail = dayRailModel([anna, julia, stranger], [], new Date('2026-09-17T08:00:00Z'), TZ, {
      lanes: { count: 2, of: (memberId) => lanes[memberId] },
    })!;
    expect(rail.lanes).toBe(2);
    expect(rail.segments.map((segment) => [segment.key, segment.lane])).toEqual([
      ['b-a', 0],
      ['b-j', 1],
    ]);
  });

  it('у одиночки дорожка одна', () => {
    const rail = dayRailModel(
      [booking('2026-09-17T09:00:00Z', 60)],
      [],
      new Date('2026-09-17T08:00:00Z'),
      TZ,
    )!;
    expect(rail.lanes).toBe(0);
    expect(rail.segments[0]!.lane).toBeUndefined();
  });
});
