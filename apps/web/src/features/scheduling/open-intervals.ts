import type { Booking } from '@/features/bookings/types';

import type { PublishedSlot } from './types';

/** Открытое время одного человека одним отрезком: «свободно 10:00–16:00». */
export interface OpenInterval {
  memberId: string;
  startsAt: string;
  endsAt: string;
  minutes: number;
}

/** Длина одиночного окна, у которого нет соседей, по которым её узнать. */
const LONE_WINDOW_MINUTES = 30;
/** Шаг публикации периодом — от 15 минут до двух часов; дальше это уже не шаг, а дыра. */
const MIN_STEP = 15;
const MAX_STEP = 120;

/** Визиты, которые держат время: отменённые и погашенные его отдали. */
const HOLDING = new Set<Booking['status']>(['pending', 'confirmed', 'completed', 'no_show']);

const MINUTE = 60_000;

type BookingLike = Pick<Booking, 'organizationMemberId' | 'startsAt' | 'status' | 'items'>;

/**
 * Открытое время отрезками, а не окнами.
 *
 * Правда о времени в AMOLIE — опубликованные окна (`published_slots`): на них
 * держится защита от двойной записи. Человеку же нужно «свободно 10:00–16:00»
 * (спецификация §20), а не шестнадцать строк по полчаса. Это представление, а
 * не модель: ничего не вычисляется для клиента и ничего не пишется.
 *
 * Длины у окна нет. Её даёт шаг, которым человек публиковал: окна в 10:00,
 * 11:00 и 12:00 — это время до 13:00, а не три получаса с дырами. Шаг — самое
 * короткое расстояние между его окнами в этот набор; одиночное окно — полчаса.
 *
 * Отрезок рвут занятое окно, окно внутри идущего визита и скрытое окно:
 * скрытое у мастера есть, но клиенту его не предлагают, то есть для записи оно
 * не открыто.
 */
export function openIntervals(slots: PublishedSlot[], bookings: BookingLike[]): OpenInterval[] {
  const busy = new Map<string, { from: number; to: number }[]>();
  for (const booking of bookings) {
    if (!HOLDING.has(booking.status)) continue;
    const from = new Date(booking.startsAt).getTime();
    const minutes = booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0);
    const spans = busy.get(booking.organizationMemberId) ?? [];
    spans.push({ from, to: from + Math.max(minutes, LONE_WINDOW_MINUTES) * MINUTE });
    busy.set(booking.organizationMemberId, spans);
  }

  const byMember = new Map<string, PublishedSlot[]>();
  for (const slot of slots) {
    const list = byMember.get(slot.organizationMemberId) ?? [];
    list.push(slot);
    byMember.set(slot.organizationMemberId, list);
  }

  const intervals: OpenInterval[] = [];
  for (const [memberId, own] of byMember) {
    const times = own.map((slot) => new Date(slot.startsAt).getTime()).sort((a, b) => a - b);
    const step = stepOf(times) * MINUTE;
    const spans = busy.get(memberId) ?? [];

    const open = own
      .filter((slot) => slot.status === 'available' && !slot.hiddenAt)
      .map((slot) => new Date(slot.startsAt).getTime())
      .filter((at) => !spans.some((span) => at >= span.from && at < span.to))
      .sort((a, b) => a - b);

    let current: { from: number; to: number } | null = null;
    const flush = () => {
      if (!current) return;
      intervals.push({
        memberId,
        startsAt: new Date(current.from).toISOString(),
        endsAt: new Date(current.to).toISOString(),
        minutes: Math.round((current.to - current.from) / MINUTE),
      });
      current = null;
    };

    for (const at of open) {
      /* Отрезок не заходит на визит: окно 11:00 с шагом в час при визите в
         11:30 открыто только до 11:30. */
      const nextBusy = spans
        .filter((span) => span.from > at)
        .reduce((earliest, span) => Math.min(earliest, span.from), Infinity);
      const end = Math.min(at + step, nextBusy);
      if (current && at <= current.to) current.to = Math.max(current.to, end);
      else {
        flush();
        current = { from: at, to: end };
      }
    }
    flush();
  }

  return intervals.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function stepOf(times: number[]): number {
  let smallest = Infinity;
  for (let index = 1; index < times.length; index += 1) {
    const gap = (times[index]! - times[index - 1]!) / MINUTE;
    if (gap > 0 && gap < smallest) smallest = gap;
  }
  if (!Number.isFinite(smallest) || smallest > MAX_STEP) return LONE_WINDOW_MINUTES;
  return Math.max(MIN_STEP, smallest);
}
