import { describe, expect, it } from 'vitest';

import type { Booking, BookingStatus } from '../bookings/types';
import { firstMove } from './first-move';

const NOW = new Date('2026-09-28T12:00:00.000Z').getTime();

const visit = (minutesFromNow: number, status: BookingStatus = 'confirmed', minutes = 60) =>
  ({
    id: `v-${minutesFromNow}-${status}`,
    status,
    startsAt: new Date(NOW + minutesFromNow * 60_000).toISOString(),
    items: [{ durationMinutesSnapshot: minutes }],
  }) as Booking;

const input = (over: Partial<Parameters<typeof firstMove>[0]> = {}) => ({
  today: [],
  pending: [],
  nextWindowInMinutes: null,
  openAhead: true,
  now: NOW,
  ...over,
});

describe('firstMove', () => {
  it('долг перед клиентом старше всего', () => {
    /* В кресле человек, а заявки всё равно первыми: их ждут другие люди. */
    expect(firstMove(input({ pending: [visit(-500, 'pending')], today: [visit(-10)] }))).toEqual({
      kind: 'answer',
      count: 1,
    });
  });

  /* «Сейчас в кресле Анна» — состояние дня, а не дело, которое делают: в
     совет оно не попадает, и рядом с идущим приёмом кабинет советует то, что
     действительно можно сделать. */
  it('идущий приём советом не считается', () => {
    expect(firstMove(input({ today: [visit(-10)], nextWindowInMinutes: 10 }))).toEqual({
      kind: 'offer',
      count: 10,
    });
  });

  it('кончившийся визит без отметки — следующий по старшинству', () => {
    expect(firstMove(input({ today: [visit(-120)] }))).toEqual({ kind: 'complete', count: 1 });
  });

  it('близкое окно предлагается, далёкое — нет', () => {
    expect(firstMove(input({ nextWindowInMinutes: 40 }))).toEqual({ kind: 'offer', count: 40 });
    expect(firstMove(input({ nextWindowInMinutes: 400 }))).toBeNull();
  });

  it('без открытого времени впереди записаться не на что', () => {
    expect(firstMove(input({ openAhead: false }))).toEqual({ kind: 'openTime', count: 0 });
  });

  it('когда день идёт как надо, кабинет молчит', () => {
    expect(firstMove(input({ today: [visit(120)] }))).toBeNull();
  });

  it('завершённые и отменённые советов не рождают', () => {
    expect(
      firstMove(input({ today: [visit(-120, 'completed'), visit(-90, 'cancelled_by_client')] })),
    ).toBeNull();
  });
});
