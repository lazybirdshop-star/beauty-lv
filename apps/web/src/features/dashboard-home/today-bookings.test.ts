import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Booking, BookingStatus } from '../bookings/types';

import { getTodaysBookings } from './today-bookings';

/**
 * «Сегодня» принадлежит организации, а не процессу.
 *
 * Сервер кабинета живёт в UTC. Для мастера в Риге (UTC+3) это значило, что
 * каждую ночь с 00:00 до 03:00 серверное «сегодня» было вчерашним днём: весь
 * наступивший день пропадал с главной вместе с той самой ночной записью в
 * 02:14, ради которой продукт и существует.
 */

function booking(startsAt: string, status: BookingStatus = 'confirmed'): Booking {
  return {
    id: startsAt,
    organizationId: 'org',
    organizationMemberId: 'member',
    publishedSlotId: 'slot',
    clientUserId: null,
    guestName: 'Анна',
    guestPhone: null,
    guestEmail: null,
    guestInstagram: null,
    status,
    cancellationReason: null,
    source: 'public_page',
    notes: null,
    startsAt,
    items: [],
    createdAt: startsAt,
    updatedAt: startsAt,
  };
}

const RIGA = 'Europe/Riga';

afterEach(() => {
  vi.useRealTimers();
});

/** 16 августа 2026, 01:30 в Риге — по UTC это ещё 15-е, 22:30. */
function nightInRiga() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-15T22:30:00.000Z'));
}

describe('getTodaysBookings — сутки организации', () => {
  it('ночью держит наступивший день мастера, а не вчерашний день сервера', () => {
    nightInRiga();

    const todays = getTodaysBookings(
      [
        // 16 августа, 02:14 по Риге — герой продукта.
        booking('2026-08-15T23:14:00.000Z', 'pending'),
        // 16 августа, 10:00 и 17:00 по Риге.
        booking('2026-08-16T07:00:00.000Z'),
        booking('2026-08-16T14:00:00.000Z'),
        // 15 августа, 17:00 по Риге — вчера, и остаться не должно.
        booking('2026-08-15T14:00:00.000Z'),
      ],
      RIGA,
    );

    expect(todays.map((b) => b.startsAt)).toEqual([
      '2026-08-15T23:14:00.000Z',
      '2026-08-16T07:00:00.000Z',
      '2026-08-16T14:00:00.000Z',
    ]);
  });

  it('в этот же момент UTC-сервер выдаёт совсем другой день — цена ошибки', () => {
    nightInRiga();

    const set = [
      booking('2026-08-15T14:00:00.000Z'), // 15 авг, 17:00 Рига
      booking('2026-08-15T23:14:00.000Z', 'pending'), // 16 авг, 02:14 Рига
      booking('2026-08-16T07:00:00.000Z'), // 16 авг, 10:00 Рига
    ];

    /* Оба вызова — про один и тот же момент времени, разница только в мерке.
       Тест намеренно сравнивает два явных пояса, а не «пояс процесса»: TZ
       прогона у разработчика и в CI разные, и такая проверка была бы то
       зелёной, то красной без единой правки кода. */
    expect(getTodaysBookings(set, RIGA).map((b) => b.startsAt)).toEqual([
      '2026-08-15T23:14:00.000Z',
      '2026-08-16T07:00:00.000Z',
    ]);

    expect(getTodaysBookings(set, 'UTC').map((b) => b.startsAt)).toEqual([
      '2026-08-15T14:00:00.000Z',
      '2026-08-15T23:14:00.000Z',
    ]);
  });

  it('отменённые и неявку в сегодняшний список не пускает', () => {
    nightInRiga();

    const todays = getTodaysBookings(
      [
        booking('2026-08-16T07:00:00.000Z', 'cancelled_by_master'),
        booking('2026-08-16T08:00:00.000Z', 'cancelled_by_client'),
        booking('2026-08-16T09:00:00.000Z', 'no_show'),
        booking('2026-08-16T10:00:00.000Z', 'completed'),
      ],
      RIGA,
    );

    expect(todays.map((b) => b.status)).toEqual(['completed']);
  });
});
