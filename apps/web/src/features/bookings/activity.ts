import { clientApiFetch } from '@/lib/client-api';

import type { Booking } from './types';

/** Событие ленты «Что нового»: клиент записался сам или отменил. */
export interface BookingActivity {
  kind: 'booked' | 'cancelled';
  /** Когда случилось: создание записи или её отмена. */
  at: string;
  booking: Booking;
}

/** Без `since` сервер отдаёт две недели и дальше тридцати дней не смотрит. */
export function listActivity(slug: string, since?: Date): Promise<BookingActivity[]> {
  const query = since ? `?from=${encodeURIComponent(since.toISOString())}` : '';
  return clientApiFetch<BookingActivity[]>(`/organizations/${slug}/bookings/activity${query}`);
}

const DAY = 24 * 60 * 60_000;

/**
 * С какого момента событие считается новым.
 *
 * Ленту ни разу не открывали на этом устройстве — новыми считаются только
 * последние сутки: иначе первый заход в кабинет встречал бы тридцатью
 * «непрочитанными» за две недели, и точка на колокольчике перестала бы
 * что-либо значить с первого дня.
 */
export function unreadSince(lastSeen: string | null, now = Date.now()): number {
  const seen = lastSeen ? Date.parse(lastSeen) : Number.NaN;
  return Number.isNaN(seen) ? now - DAY : seen;
}

export function unreadCount(
  events: BookingActivity[],
  lastSeen: string | null,
  now = Date.now(),
): number {
  const threshold = unreadSince(lastSeen, now);
  return events.filter((event) => Date.parse(event.at) > threshold).length;
}
