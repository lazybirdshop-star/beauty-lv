import type { Booking } from '@/features/bookings/types';

/** Длина визита без позиций — как у сетки календаря: полчаса, а не ноль. */
const FALLBACK_MINUTES = 30;

/** Визит, который ещё требует действия: ждёт ответа, подтверждён или истёк без ответа. */
const OPEN_STATUSES: Booking['status'][] = ['pending', 'confirmed', 'expired'];

export function visitEnd(booking: Booking): number {
  const minutes =
    booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) || FALLBACK_MINUTES;
  return Date.parse(booking.startsAt) + minutes * 60_000;
}

export interface FrontDeskModel {
  /** Визит идёт прямо сейчас. */
  inChair: Booking[];
  /** Ещё придут сегодня. */
  next: Booking[];
  /** Время прошло, а отметки нет: пришёл клиент или нет. */
  awaiting: Booking[];
  doneCount: number;
}

/**
 * День ресепшена тремя вопросами (спецификация дашборда §58).
 *
 * Администратор у стойки не читает сетку — она отвечает на три вопроса: кто
 * сейчас в креслах, кого ждать дальше и кого забыли отметить. Последний
 * вопрос важнее, чем кажется: не отмеченный визит не попадает в доход и
 * висит «подтверждённым» в прошлом.
 *
 * Отменённые и «не пришёл» в группы не входят — с ними у стойки делать
 * нечего; завершённые только считаются.
 */
export function frontDeskModel(bookings: Booking[], now: number): FrontDeskModel {
  const model: FrontDeskModel = { inChair: [], next: [], awaiting: [], doneCount: 0 };
  const byStart = [...bookings].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

  for (const booking of byStart) {
    if (booking.status === 'completed') {
      model.doneCount += 1;
      continue;
    }
    if (!OPEN_STATUSES.includes(booking.status)) continue;

    const start = Date.parse(booking.startsAt);
    if (visitEnd(booking) <= now) model.awaiting.push(booking);
    else if (start <= now) model.inChair.push(booking);
    else model.next.push(booking);
  }

  return model;
}
