import { describe, expect, it } from 'vitest';

import { groupBookings } from './grouping';
import type { Booking } from './types';

const RIGA = 'Europe/Riga';
const TODAY = '2026-09-22';

function booking(values: Partial<Booking> & { id: string; startsAt: string }): Booking {
  return {
    status: 'confirmed',
    guestName: 'Анна',
    guestPhone: '+37120000114',
    items: [],
    ...values,
  } as Booking;
}

function keys(groups: ReturnType<typeof groupBookings>, key: string) {
  return groups.find((group) => group.key === key)?.all.map((row) => row.id) ?? [];
}

describe('groupBookings', () => {
  it('раскладывает визиты по дню заведения, а не по UTC', () => {
    /* 21:30 UTC — это уже следующие сутки в Риге, и визит принадлежит завтра,
       а не сегодня: день считает пояс салона. */
    const groups = groupBookings(
      [
        booking({ id: 'late', startsAt: '2026-09-22T21:30:00.000Z' }),
        booking({ id: 'noon', startsAt: '2026-09-22T09:00:00.000Z' }),
      ],
      'all',
      TODAY,
      RIGA,
    );

    expect(keys(groups, 'today')).toEqual(['noon']);
    expect(keys(groups, 'upcoming')).toEqual(['late']);
  });

  it('ждущая ответа заявка уходит из «ждут», когда её час прошёл', () => {
    const groups = groupBookings(
      [
        booking({ id: 'stale', status: 'pending', startsAt: '2026-09-20T09:00:00.000Z' }),
        booking({ id: 'fresh', status: 'pending', startsAt: '2026-09-23T09:00:00.000Z' }),
      ],
      'all',
      TODAY,
      RIGA,
    );

    expect(keys(groups, 'pending')).toEqual(['fresh']);
    expect(keys(groups, 'past')).toEqual(['stale']);
  });

  it('отменённые идут своей лентой и не попадают в прошлое', () => {
    const groups = groupBookings(
      [
        booking({ id: 'off', status: 'cancelled_by_client', startsAt: '2026-09-20T09:00:00.000Z' }),
        booking({ id: 'done', status: 'completed', startsAt: '2026-09-20T10:00:00.000Z' }),
      ],
      'all',
      TODAY,
      RIGA,
    );

    expect(keys(groups, 'cancelled')).toEqual(['off']);
    expect(keys(groups, 'past')).toEqual(['done']);
  });

  it('будущее — вперёд по времени, прошлое — назад', () => {
    const groups = groupBookings(
      [
        booking({ id: 'later', startsAt: '2026-09-25T09:00:00.000Z' }),
        booking({ id: 'sooner', startsAt: '2026-09-24T09:00:00.000Z' }),
        booking({ id: 'older', status: 'completed', startsAt: '2026-09-01T09:00:00.000Z' }),
        booking({ id: 'newer', status: 'completed', startsAt: '2026-09-10T09:00:00.000Z' }),
      ],
      'all',
      TODAY,
      RIGA,
    );

    expect(keys(groups, 'upcoming')).toEqual(['sooner', 'later']);
    expect(keys(groups, 'past')).toEqual(['newer', 'older']);
  });

  it('фильтр сужает все ленты разом', () => {
    const groups = groupBookings(
      [
        booking({ id: 'done', status: 'completed', startsAt: '2026-09-20T09:00:00.000Z' }),
        booking({ id: 'off', status: 'cancelled_by_master', startsAt: '2026-09-20T10:00:00.000Z' }),
      ],
      'completed',
      TODAY,
      RIGA,
    );

    expect(keys(groups, 'past')).toEqual(['done']);
    expect(keys(groups, 'cancelled')).toEqual([]);
  });
});
