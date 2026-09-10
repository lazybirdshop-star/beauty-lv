import type { Booking } from '@/features/bookings/types';
import { serviceTone } from '@/features/dashboard-home/service-tone';
import type { TeamMember } from '@/features/team/types';
import { initials } from '@/lib/avatar';

import { SLOT_MINUTES, minutesOfDay, type CalendarColumn } from './calendar-model';
import { toDateKey, type WeekDay } from './week';

/**
 * Вид календаря.
 *
 * «Команда» — не отдельный экран, а та же сетка, где колонка — человек, а не
 * день (спецификация §12). Остальные три знакомы и соло-мастеру.
 */
export type CalendarView = 'team' | 'day' | 'week' | 'list';

const VIEWS: readonly CalendarView[] = ['team', 'day', 'week', 'list'];

export function isCalendarView(value: unknown): value is CalendarView {
  return typeof value === 'string' && (VIEWS as readonly string[]).includes(value);
}

/**
 * Какой вид показать.
 *
 * Порядок ответа: адрес, затем последний выбор этого человека, затем умолчание
 * по роли — администратор салона живёт в командном дне, соло-мастер в неделе.
 * «Команда» недоступна тому, у кого нет команды или права видеть чужое время, и
 * тогда даже явный `?view=team` в адресе молча становится неделей: ссылка из
 * чужого кабинета не должна показывать пустую сетку без колонок.
 *
 * На телефоне любой вид сетки становится днём: семь колонок, как и восемь
 * мастеров, в 390 пикселей не помещаются (спецификация §84). Сам выбор при этом
 * не стирается — на большом экране вернётся та же неделя.
 */
export function resolveView(
  requested: string | null,
  stored: CalendarView | undefined,
  options: { teamAvailable: boolean; narrow: boolean },
): CalendarView {
  const allowed = (value: unknown): value is CalendarView =>
    isCalendarView(value) && (value !== 'team' || options.teamAvailable);
  const chosen = allowed(requested)
    ? requested
    : allowed(stored)
      ? stored
      : options.teamAvailable
        ? 'team'
        : 'week';
  return options.narrow && chosen !== 'list' ? 'day' : chosen;
}

/** Визит, разложенный по дню и минутам, — то, что сетка ставит на место. */
export interface CalendarEntry {
  id: string;
  booking: Booking;
  /** Чей это визит: в командном виде это и есть колонка. */
  memberId: string;
  /** Минуты от полуночи в поясе заведения. */
  at: number;
  minutes: number;
  /** В какой колонке рисовать: день недели или мастер — решает вид. */
  columnKey: string;
  dateKey: string;
  clientName: string;
  serviceName: string;
  tone: string;
  /** Запись, которую ещё не подтвердили: пунктир и янтарная точка. */
  pending: boolean;
}

export type UnplacedEntry = Omit<CalendarEntry, 'columnKey'>;

/** Отменённое и погашенное время не занимает — его в сетке нет. */
const OFF_CALENDAR = new Set<Booking['status']>([
  'cancelled_by_client',
  'cancelled_by_master',
  'expired',
]);

export function bookingEntries(
  bookings: Booking[],
  timeZone: string,
  guestLabel: string,
): UnplacedEntry[] {
  return bookings
    .filter((booking) => !OFF_CALENDAR.has(booking.status))
    .map((booking) => ({
      id: booking.id,
      booking,
      memberId: booking.organizationMemberId,
      dateKey: toDateKey(booking.startsAt, timeZone),
      at: minutesOfDay(booking.startsAt, timeZone),
      minutes:
        booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) || SLOT_MINUTES,
      clientName: booking.guestName || guestLabel,
      serviceName: booking.items.map((item) => item.serviceNameSnapshot).join(' + '),
      tone: serviceTone(booking.items[0]?.serviceId ?? booking.id),
      pending: booking.status === 'pending',
    }));
}

/**
 * В какую колонку встаёт визит.
 *
 * В командном виде — в колонку своего мастера, и только визиты показанного
 * дня. В остальных — в колонку своего дня, и только того человека, чьё время
 * смотрят: неделя владелицы салона со всеми визитами всех мастеров в одной
 * колонке — это наложенные друг на друга чужие дни.
 */
export function placeEntries(
  entries: UnplacedEntry[],
  view: CalendarView,
  scope: { dateKey: string; personId: string | null },
): CalendarEntry[] {
  if (view === 'team') {
    return entries
      .filter((entry) => entry.dateKey === scope.dateKey)
      .map((entry) => ({ ...entry, columnKey: entry.memberId }));
  }
  return entries
    .filter((entry) => !scope.personId || entry.memberId === scope.personId)
    .map((entry) => ({ ...entry, columnKey: entry.dateKey }));
}

/** Человек, которому принадлежит колонка командного дня. */
export interface ColumnPerson {
  name: string;
  initials: string;
  avatarUrl: string | null;
  /** Строка под именем: сколько у него визитов в этот день. */
  meta: string;
}

/**
 * Колонка сетки глазами экрана: к устройству колонки добавлено, чьё в ней
 * время. Пустое место в ней предлагает действие за этого человека.
 */
export interface GridColumn extends CalendarColumn {
  memberId: string | null;
  person?: ColumnPerson;
}

export function weekColumns(days: WeekDay[], personId: string | null): GridColumn[] {
  return days.map((day) => ({
    key: day.dateKey,
    dateKey: day.dateKey,
    title: day.weekdayShort,
    subtitle: String(day.dayNumber),
    highlight: day.isToday,
    slots: personId
      ? day.slots.filter((slot) => slot.organizationMemberId === personId)
      : day.slots,
    memberId: personId,
  }));
}

/**
 * Колонки командного дня — по одной на человека.
 *
 * Работающие видны всегда, даже с пустым днём: «у Макса сегодня ничего» — это
 * ответ, а пропавшая колонка читается как ошибка. Отстранённая остаётся, только
 * если за ней в этот день стоит время: скрыть её колонку значило бы показать
 * администратору свободный день там, где к человеку записан клиент.
 */
export function teamColumns(
  day: WeekDay,
  members: TeamMember[],
  visible: ReadonlySet<string> | null,
  entries: UnplacedEntry[],
  describe: (bookings: number) => string,
): GridColumn[] {
  const bookingsOf = new Map<string, number>();
  for (const entry of entries) {
    if (entry.dateKey !== day.dateKey) continue;
    bookingsOf.set(entry.memberId, (bookingsOf.get(entry.memberId) ?? 0) + 1);
  }

  return members
    .filter(
      (member) =>
        member.status === 'active' ||
        bookingsOf.has(member.id) ||
        day.slots.some((slot) => slot.organizationMemberId === member.id),
    )
    .filter((member) => !visible || visible.has(member.id))
    .map((member) => ({
      key: member.id,
      dateKey: day.dateKey,
      title: member.name,
      subtitle: '',
      highlight: false,
      slots: day.slots.filter((slot) => slot.organizationMemberId === member.id),
      memberId: member.id,
      person: {
        name: member.name,
        initials: initials(member.name),
        avatarUrl: member.avatarUrl,
        meta: describe(bookingsOf.get(member.id) ?? 0),
      },
    }));
}

/**
 * Нажатие по человеку в фильтре командного дня.
 *
 * Из «всех» нажатие оставляет одного — это вопрос «покажи мне Юлю», а не
 * «спрячь Юлю». Дальше нажатия добавляют и убирают. Пустого набора не бывает:
 * сетка без колонок ничего не отвечает, поэтому последний снятый возвращает
 * всех, и полный набор тоже называется «все».
 */
export function toggleVisible(
  current: ReadonlySet<string> | null,
  memberId: string,
  allIds: readonly string[],
): Set<string> | null {
  if (!current) return new Set([memberId]);
  const next = new Set(current);
  if (next.has(memberId)) next.delete(memberId);
  else next.add(memberId);
  if (next.size === 0 || allIds.every((id) => next.has(id))) return null;
  return next;
}

/**
 * Сохранённый фильтр против сегодняшнего состава.
 *
 * Человек мог уйти из команды с тех пор, как фильтр запомнили; набор из одних
 * ушедших — это пустая сетка, и честнее показать всех.
 */
export function restoreVisible(
  stored: readonly string[] | undefined,
  allIds: readonly string[],
): Set<string> | null {
  if (!stored) return null;
  const known = stored.filter((id) => allIds.includes(id));
  return known.length === 0 || known.length === allIds.length ? null : new Set(known);
}
