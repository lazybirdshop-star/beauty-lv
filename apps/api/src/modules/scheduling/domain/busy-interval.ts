import { DASHBOARD_ERROR_CODES } from '@amolie/shared-kernel';

/**
 * Отрезок, который уже занят визитом: от его начала до конца работы мастера.
 *
 * Окно (`published_slots`) длины не имеет — это «сюда можно записаться»
 * (PRD.md §7.4), — поэтому «занято» нельзя прочитать по статусу окон. Визит на
 * 195 минут, начатый в 18:30, держит ровно одно окно 18:30, если больше окон в
 * тот день опубликовано не было; всё время до 22:00 при этом занято, и ни одна
 * строка в базе об этом сама не говорит. Отрезок — то самое недостающее
 * утверждение, и считается он из записи: начало окна плюс `visitDurationMinutes`.
 *
 * Полуинтервал `[startsAt, endsAt)`: визит, кончающийся в 22:00, освобождает
 * 22:00 — следующий может начинаться ровно там.
 */
export interface BusyInterval {
  bookingId: string;
  organizationMemberId: string;
  startsAt: Date;
  endsAt: Date;
}

/**
 * Момент внутри визита — тот самый отрезок, если он есть.
 *
 * Отвечает на вопрос публикации: «в это время у мастера уже кто-то сидит?».
 * Начало отрезка включено намеренно: окно ровно на старте визита занято им же.
 */
export function busyIntervalAt(
  intervals: BusyInterval[],
  organizationMemberId: string,
  moment: Date,
): BusyInterval | null {
  const time = moment.getTime();
  return (
    intervals.find(
      (interval) =>
        interval.organizationMemberId === organizationMemberId &&
        interval.startsAt.getTime() <= time &&
        time < interval.endsAt.getTime(),
    ) ?? null
  );
}

/**
 * Пересекается ли предполагаемый визит `[startsAt, endsAt)` с чужим.
 *
 * Не то же, что `busyIntervalAt`: там точка, здесь отрезок. Окно в 21:00
 * свободно, но девяностоминутная услуга из него дотянется до 22:30 и наедет на
 * визит, начинающийся в 21:30, — точка бы этого не заметила.
 */
export function overlapsBusy(
  intervals: BusyInterval[],
  organizationMemberId: string,
  startsAt: Date,
  endsAt: Date,
): boolean {
  const from = startsAt.getTime();
  const to = endsAt.getTime();
  return intervals.some(
    (interval) =>
      interval.organizationMemberId === organizationMemberId &&
      interval.startsAt.getTime() < to &&
      from < interval.endsAt.getTime(),
  );
}

/**
 * Окно попало внутрь уже идущего визита.
 *
 * Отдельно от «окно уже опубликовано» (`slot_duplicate`) и «окно занято»
 * (`slot_booked`): там мастер видит своё же окно и понимает, что происходит, а
 * здесь на это время окна нет вовсе — есть визит, который через него идёт.
 * Поэтому ошибка несёт `visitEndsAt`: без него экран может сказать только
 * «нельзя», а сказать надо «у вас визит до 22:00».
 */
export class SlotInsideBookingError extends Error {
  readonly code = DASHBOARD_ERROR_CODES.slotInsideBooking;

  constructor(readonly visitEndsAt: Date) {
    super('В это время у вас идёт визит');
  }
}
