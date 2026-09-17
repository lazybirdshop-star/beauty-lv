import type { Booking } from '@/features/bookings/types';
import { openIntervals } from '@/features/scheduling/open-intervals';
import type { PublishedSlot, TimeBlock } from '@/features/scheduling/types';
import { isSameDay } from '@/lib/format';

import { getDayBookings } from './today-bookings';

const MINUTE = 60_000;
const HALF_HOUR = 30 * MINUTE;
/**
 * С какого перерыва стоит предлагать открыть время.
 *
 * Полчаса между визитами — это кофе и уборка места, а не время, которое мастер
 * продала бы. Полтора часа уже помещают визит, и молчать о них — терять запись.
 */
const WORTH_OPENING = 90 * MINUTE;

/** Минуты от полуночи в поясе заведения. */
function minuteOfDay(ms: number, timeZone: string): number {
  const [hour = 0, minute = 0] = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  })
    .format(ms)
    .split(':')
    .map(Number);
  return hour * 60 + minute;
}

/** Самое раннее начало окна мастера за неделю — минутой суток; `null`, если окон нет. */
function earliestStart(
  slots: PublishedSlot[],
  memberId: string | null,
  timeZone: string,
): number | null {
  const starts = slots
    .filter((slot) => !memberId || slot.organizationMemberId === memberId)
    .map((slot) => minuteOfDay(new Date(slot.startsAt).getTime(), timeZone));
  return starts.length ? Math.min(...starts) : null;
}

const durationOf = (booking: Booking) =>
  booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) * MINUTE;

/** Неоткрытое время до ближайшего визита: «Свободно 11:00–14:00». */
export interface TodayGap {
  from: string;
  to: string;
}

/**
 * Что происходит сегодня и что требует внимания — главный вопрос экрана
 * «Сегодня» (спецификация §8), посчитанный отдельно от разметки.
 *
 * `slots` — окна с начала сегодняшних суток и на неделю вперёд: сегодняшние
 * дают открытое время дня, а будущие отвечают на вопрос «сможет ли вообще
 * кто-нибудь записаться». `memberId` — чьё время подсказывать открыть: у
 * салона пустое место в чужом дне — не повод дёргать владелицу.
 */
export function todayModel(
  bookings: Booking[],
  slots: PublishedSlot[],
  now: Date,
  timeZone: string,
  options: { memberId?: string | null; blocks?: TimeBlock[] } = {},
) {
  const nowMs = now.getTime();
  const today = getDayBookings(bookings, now, timeZone);

  const next = today.find(
    (booking) =>
      booking.status === 'confirmed' &&
      new Date(booking.startsAt).getTime() + durationOf(booking) > nowMs,
  );

  const revenue = new Map<string, number>();
  for (const booking of today) {
    for (const item of booking.items)
      revenue.set(
        item.priceCurrencySnapshot,
        (revenue.get(item.priceCurrencySnapshot) ?? 0) + item.priceAmountSnapshot,
      );
  }

  const todaySlots = slots.filter((slot) => isSameDay(slot.startsAt, now, timeZone));
  const open = todaySlots
    .filter(
      (slot) => slot.status === 'available' && !slot.hiddenAt && new Date(slot.startsAt) > now,
    )
    .filter(
      (slot) =>
        !today.some((booking) => {
          if (booking.organizationMemberId !== slot.organizationMemberId) return false;
          const start = new Date(booking.startsAt).getTime();
          const at = new Date(slot.startsAt).getTime();
          return at >= start && at < start + durationOf(booking);
        }),
    );

  /* Открытое время отрезками, и только то, что ещё не прошло. */
  const intervals = openIntervals(todaySlots, today).filter(
    (interval) => new Date(interval.endsAt).getTime() > nowMs,
  );

  /* Отмена клиентом — единственное событие дня, о котором мастер узнаёт не
     по своему действию: освободившееся время можно отдать другому. Прошедшие
     отмены уже ничего не освобождают. */
  const cancelled = bookings.filter(
    (booking) =>
      booking.status === 'cancelled_by_client' &&
      isSameDay(booking.startsAt, now, timeZone) &&
      new Date(booking.startsAt).getTime() > nowMs,
  );

  /* Нечего выбрать на неделю вперёд — страница записи работает вхолостую. */
  const openAhead = slots.some(
    (slot) =>
      slot.status === 'available' && !slot.hiddenAt && new Date(slot.startsAt).getTime() > nowMs,
  );

  const memberId = options.memberId ?? null;
  const mine = memberId
    ? today.filter((booking) => booking.organizationMemberId === memberId)
    : today;
  const upcoming = mine.find(
    (booking) =>
      (booking.status === 'confirmed' || booking.status === 'pending') &&
      new Date(booking.startsAt).getTime() > nowMs,
  );

  let gap: TodayGap | null = null;
  if (upcoming) {
    /* Идущий визит — не свободное время: считаем от его конца. */
    const busyUntil = mine.reduce((latest, booking) => {
      const start = new Date(booking.startsAt).getTime();
      const end = start + durationOf(booking);
      return start <= nowMs && end > nowMs ? Math.max(latest, end) : latest;
    }, nowMs);
    const to = new Date(upcoming.startsAt).getTime();
    /*
     * Не раньше, чем мастер обычно начинает.
     *
     * Отсчёт шёл от «сейчас», и в четыре утра главная звала «Свободно
     * 04:30–09:00 · Открыть для онлайн-записи» — ночь выдавалась за перерыв.
     * Рабочих часов в модели нет, но окна мастера на неделе их показывают:
     * самое раннее из них — начало её дня. Нет окон — нет и знания, и
     * отсчёт остаётся от «сейчас».
     */
    const dayStart = earliestStart(slots, memberId, timeZone);
    const fromNow = Math.ceil(busyUntil / HALF_HOUR) * HALF_HOUR;
    const shortBy = dayStart === null ? 0 : dayStart - minuteOfDay(fromNow, timeZone);
    const from = shortBy > 0 ? fromNow + shortBy * MINUTE : fromNow;
    const alreadyOpen = intervals.some(
      (interval) =>
        (!memberId || interval.memberId === memberId) &&
        new Date(interval.startsAt).getTime() < to &&
        new Date(interval.endsAt).getTime() > from,
    );
    /* Заблокированное время — не «неоткрытое»: мастер сама сказала, что её
       нет, и звать открыть его значит спорить с ней. */
    const blocked = (options.blocks ?? []).some(
      (block) =>
        (!memberId || block.organizationMemberId === memberId) &&
        new Date(block.startsAt).getTime() < to &&
        new Date(block.endsAt).getTime() > from,
    );
    if (to - from >= WORTH_OPENING && !alreadyOpen && !blocked) {
      gap = { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
    }
  }

  return {
    today,
    next,
    revenue: [...revenue],
    open,
    intervals,
    cancelled,
    openAhead,
    gap,
  };
}
