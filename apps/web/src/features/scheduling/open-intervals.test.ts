import { describe, expect, it } from 'vitest';

import type { Booking } from '@/features/bookings/types';

import { openIntervals } from './open-intervals';
import type { PublishedSlot } from './types';

const ANNA = 'anna';
const JULIA = 'julia';

function slot(owner: string, time: string, overrides: Partial<PublishedSlot> = {}): PublishedSlot {
  return {
    id: `${owner}-${time}`,
    organizationMemberId: owner,
    startsAt: `2026-09-10T${time}:00.000Z`,
    status: 'available',
    hiddenAt: null,
    ...overrides,
  } as PublishedSlot;
}

function visit(
  owner: string,
  time: string,
  minutes: number,
  status: Booking['status'] = 'confirmed',
) {
  return {
    organizationMemberId: owner,
    startsAt: `2026-09-10T${time}:00.000Z`,
    status,
    items: [{ durationMinutesSnapshot: minutes }],
  } as Booking;
}

const clock = (iso: string) => iso.slice(11, 16);

describe('openIntervals', () => {
  it('окна с шагом в час — одно время до конца последнего часа', () => {
    const [interval, ...rest] = openIntervals(
      [slot(ANNA, '10:00'), slot(ANNA, '11:00'), slot(ANNA, '12:00')],
      [],
    );
    expect(rest).toEqual([]);
    expect([clock(interval!.startsAt), clock(interval!.endsAt)]).toEqual(['10:00', '13:00']);
    expect(interval!.minutes).toBe(180);
  });

  it('визит рвёт отрезок, а отмена отдаёт время обратно', () => {
    const slots = [
      slot(ANNA, '10:00'),
      slot(ANNA, '11:00', { status: 'booked' }),
      slot(ANNA, '12:00'),
    ];
    const held = openIntervals(slots, [visit(ANNA, '11:00', 60)]);
    expect(held.map((i) => `${clock(i.startsAt)}–${clock(i.endsAt)}`)).toEqual([
      '10:00–11:00',
      '12:00–13:00',
    ]);

    const released = openIntervals(
      [slot(ANNA, '10:00'), slot(ANNA, '11:00'), slot(ANNA, '12:00')],
      [visit(ANNA, '11:00', 60, 'cancelled_by_client')],
    );
    expect(released).toHaveLength(1);
  });

  it('открытое время не заходит на визит', () => {
    /* Визит в 11:30 стоит на своём окне, и шаг у мастера — полчаса: открыто
       10:00–10:30 и 11:00–11:30, но ни минуты после начала визита. */
    const intervals = openIntervals(
      [slot(ANNA, '10:00'), slot(ANNA, '11:00'), slot(ANNA, '11:30', { status: 'booked' })],
      [visit(ANNA, '11:30', 60)],
    );
    expect(intervals.map((i) => `${clock(i.startsAt)}–${clock(i.endsAt)}`)).toEqual([
      '10:00–10:30',
      '11:00–11:30',
    ]);
  });

  it('скрытое окно для записи не открыто', () => {
    expect(
      openIntervals([slot(ANNA, '10:00', { hiddenAt: '2026-09-01T00:00:00.000Z' })], []),
    ).toEqual([]);
  });

  it('одиночное окно — полчаса', () => {
    const [lone] = openIntervals([slot(ANNA, '15:00')], []);
    expect(lone!.minutes).toBe(30);
  });

  it('у каждого человека своё время', () => {
    const intervals = openIntervals([slot(ANNA, '10:00'), slot(JULIA, '10:00')], []);
    expect(intervals.map((interval) => interval.memberId).sort()).toEqual([ANNA, JULIA]);
  });
});
