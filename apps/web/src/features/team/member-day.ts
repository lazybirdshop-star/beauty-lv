import type { PublishedSlot } from '@/features/scheduling/types';

/** Что плитка человека говорит о его дне: когда занят и сколько окон открыто. */
export interface MemberDay {
  /** Начало первого визита и конец последнего; `null` — визитов нет. */
  busy: { startsAt: string; endsAt: string } | null;
  /** Окна, в которые клиент может записаться: свободные и не скрытые. */
  openSlots: number;
}

interface BookingLike {
  organizationMemberId: string;
  startsAt: string;
  items: { durationMinutesSnapshot: number }[];
}

type SlotLike = Pick<PublishedSlot, 'organizationMemberId' | 'status' | 'hiddenAt'>;

/** Визит без длительности в снимке всё равно занимает время — как на линейке. */
const FALLBACK_MINUTES = 30;
const MINUTE = 60_000;

/**
 * День одного человека одной строкой — «с 10:00 до 18:00 · 3 окна» под
 * линейкой на плитке «Команды» (прототип «Кабинет 2026», экран `team`).
 *
 * Визиты приходят уже отобранными за день и без отменённых: какие считать,
 * решает экран, здесь только свёртка.
 */
export function memberDay(memberId: string, bookings: BookingLike[], slots: SlotLike[]): MemberDay {
  let from = Infinity;
  let to = -Infinity;
  for (const booking of bookings) {
    if (booking.organizationMemberId !== memberId) continue;
    const start = new Date(booking.startsAt).getTime();
    const minutes =
      booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) ||
      FALLBACK_MINUTES;
    from = Math.min(from, start);
    to = Math.max(to, start + minutes * MINUTE);
  }

  return {
    busy: Number.isFinite(from)
      ? { startsAt: new Date(from).toISOString(), endsAt: new Date(to).toISOString() }
      : null,
    openSlots: slots.filter(
      (slot) =>
        slot.organizationMemberId === memberId && slot.status === 'available' && !slot.hiddenAt,
    ).length,
  };
}
