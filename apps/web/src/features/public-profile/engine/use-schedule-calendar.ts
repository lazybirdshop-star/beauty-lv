'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useLocale } from '@/lib/i18n';

import {
  addMonths,
  buildMonth,
  monthsWithSlots,
  weekdayHeaders,
  type CalendarMonth,
} from './build-calendar';
import { groupSlotsByDay } from './group-by-day';
import { REPEAT_SERVICES_PARAM, requestedServiceIds } from './repeat-booking';
import type { DaySlots, PublicOrganization, PublishedSlot, SlotStatus } from './types';

/**
 * The facts row above the calendar (BRAND_STYLE_ARCHITECTURE.md §7.2). Each
 * world dresses them differently — ruled fields, sunken tiles, a typographic
 * line — but the numbers and the nearest window are one projection.
 */
export interface ScheduleFacts {
  servicesCount: number;
  availableCount: number;
  /** The window itself, not only its label — the nearest-window gesture books it. */
  nearestSlot: PublishedSlot | null;
  nearestLabel: string;
}

export interface ScheduleCalendarData {
  org: PublicOrganization;
  month: CalendarMonth;
  /** Localized Monday-first weekday header of the grid (DESIGN_AUDIT.md P1-5). */
  weekdayHeaders: string[];
  /** Months that actually contain published windows — a hint for the pager. */
  slotMonths: ReadonlySet<string>;
  facts: ScheduleFacts;
  todayKey: string;
}

export interface ScheduleCalendarState {
  visible: { year: number; month: number };
  monthLabel: string;
  selectedDate: string | undefined;
  selectedDay: DaySlots | undefined;
  selectedSlot: PublishedSlot | null;
  /** The selected day formatted for the "free windows on …" caption. */
  selectedDateLabel: string;
  canGoBack: boolean;
  /** No published windows at all — the world renders its empty state. */
  isEmpty: boolean;
  sheetOpen: boolean;
  /**
   * Услуги, с которыми запись открывается сразу, — «повторить визит» из
   * кабинета клиента. Пусто в обычном случае: человек, пришедший по ссылке
   * мастера, собирает корзину сам.
   */
  repeatServiceIds: string[];
}

export interface ScheduleCalendarActions {
  prevMonth(): void;
  nextMonth(): void;
  /** Picking a day clears the window picked on the previous one. */
  selectDate(date: string): void;
  selectSlot(slotId: string): void;
  /** Opens the booking sheet; the current pick is carried in as a preference. */
  openBooking(): void;
  /** The nearest-window gesture: picks it and opens the sheet with it carried in. */
  bookNearest(): void;
  /** Wired to the sheet's `onOpenChange`. */
  setSheetOpen(open: boolean): void;
  /** Optimistic "booked" mark right after the booking succeeds, without a refetch. */
  markBooked(slotId: string): void;
}

export interface UseScheduleCalendarArgs {
  org: PublicOrganization;
  initialSlots: PublishedSlot[];
}

const DATE_LABEL_FORMATTER_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
const SHORT_DATE_FORMATTER_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
const MONTH_LABEL_FORMATTER_OPTS: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * State of the schedule page (BRAND_STYLE_ARCHITECTURE.md §7.2): one copy for
 * every world, merged from the two former calendars — the poster one and the
 * soft one were the same logic under different chrome. The hook encapsulates:
 * the optimistic overrides after a booking, the starting month taken from the
 * first published window, the ban on paging into the past, date/slot
 * selection, the facts projection, the localized formatters and `todayKey`.
 *
 * It never decides how a day cell or a fact tile looks — that is the world's
 * composition, this is the domain they both read.
 */
export function useScheduleCalendar({ org, initialSlots }: UseScheduleCalendarArgs): {
  data: ScheduleCalendarData;
  state: ScheduleCalendarState;
  actions: ScheduleCalendarActions;
} {
  const locale = useLocale();
  /* Rebuilt only when the language changes, so they can be honest dependencies
     of the memos below instead of being omitted from them. */
  const { DATE_LABEL_FORMATTER, SHORT_DATE_FORMATTER, MONTH_LABEL_FORMATTER } = useMemo(
    () => ({
      DATE_LABEL_FORMATTER: new Intl.DateTimeFormat(locale, DATE_LABEL_FORMATTER_OPTS),
      SHORT_DATE_FORMATTER: new Intl.DateTimeFormat(locale, SHORT_DATE_FORMATTER_OPTS),
      MONTH_LABEL_FORMATTER: new Intl.DateTimeFormat(locale, MONTH_LABEL_FORMATTER_OPTS),
    }),
    [locale],
  );

  const [overrides, setOverrides] = useState<Record<string, SlotStatus>>({});
  /* Nothing is chosen for the visitor. Auto-selecting the first free date put
     a day on screen they never picked, and the action then looked ready when
     no decision had been made. */
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  /*
   * «Повторить визит»: кабинет клиента приводит человека сюда с прошлой
   * корзиной в адресе. Разбирается это здесь, у общего расписания, а не в
   * каждом из шести миров — просьба одна и та же, чей бы облик ни был вокруг.
   */
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const repeatServiceIds = useMemo(
    () => requestedServiceIds(searchParams.get(REPEAT_SERVICES_PARAM), org.services),
    [searchParams, org.services],
  );

  /* Ленивое начальное значение: запись открыта уже в первом кадре, иначе
     пришедший по ссылке видел бы страницу мастера и должен был бы нажать
     «записаться» сам — то есть ровно то, от чего его избавляли. */
  const [sheetOpen, setSheetOpen] = useState(() => repeatServiceIds.length > 0);

  /*
   * Закрыв запись, человек остаётся на странице мастера — но уже без просьбы
   * в адресе: иначе следующее открытие снова подставило бы прошлую корзину,
   * а «назад» в браузере возвращало бы её бесконечно.
   */
  function changeSheetOpen(next: boolean) {
    setSheetOpen(next);
    if (!next && searchParams.has(REPEAT_SERVICES_PARAM)) {
      router.replace(pathname, { scroll: false });
    }
  }

  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  const days = useMemo(() => {
    const withOverrides = initialSlots.map((slot) => ({
      ...slot,
      status: overrides[slot.id] ?? slot.status,
    }));
    return groupSlotsByDay(withOverrides, locale);
  }, [initialSlots, overrides, locale]);

  const selectedDay = selectedDate ? days.find((entry) => entry.date === selectedDate) : undefined;
  const selectedSlot = selectedDay?.slots.find((slot) => slot.id === selectedSlotId) ?? null;

  const selectedDateLabel = useMemo(() => {
    if (!selectedDay) return '';
    return DATE_LABEL_FORMATTER.format(new Date(`${selectedDay.date}T00:00:00`));
  }, [selectedDay, DATE_LABEL_FORMATTER]);

  /* The visible month starts wherever the first published window is, so a
     master who opened next month doesn't greet clients with an empty grid. */
  const [visible, setVisible] = useState(() => {
    const first = initialSlots[0];
    const start = first ? new Date(`${first.date}T00:00:00`) : new Date();
    return { year: start.getFullYear(), month: start.getMonth() };
  });

  const month = useMemo(() => buildMonth(visible.year, visible.month, days), [visible, days]);
  const slotMonths = useMemo(() => monthsWithSlots(days), [days]);
  const headers = useMemo(() => weekdayHeaders(locale), [locale]);

  const monthLabel = useMemo(
    () => MONTH_LABEL_FORMATTER.format(new Date(visible.year, visible.month, 1)),
    [visible, MONTH_LABEL_FORMATTER],
  );

  /* Paging back before the current month is pointless — nothing there can be
     booked — so the control simply isn't offered. */
  const now = new Date();
  const canGoBack =
    visible.year > now.getFullYear() ||
    (visible.year === now.getFullYear() && visible.month > now.getMonth());

  /* `days` is chronological, so the first available window is the nearest
     one — it leads the page as the primary gesture rather than sitting in a
     row of statistics. */
  const facts = useMemo(() => {
    const available = days.flatMap((entry) =>
      entry.slots.filter((slot) => slot.status === 'available'),
    );
    const nearest = available[0];
    return {
      servicesCount: org.services.length,
      availableCount: available.length,
      nearestSlot: nearest ?? null,
      nearestLabel: nearest
        ? SHORT_DATE_FORMATTER.format(new Date(`${nearest.date}T00:00:00`))
        : '—',
    };
  }, [days, org.services.length, SHORT_DATE_FORMATTER]);

  function selectDate(date: string) {
    setSelectedDate(date);
    setSelectedSlotId(null);
  }

  function markBooked(slotId: string) {
    setOverrides((prev) => ({ ...prev, [slotId]: 'booked' }));
  }

  function bookNearest() {
    const nearest = facts.nearestSlot;
    if (!nearest) return;
    setSelectedDate(nearest.date);
    setSelectedSlotId(nearest.id);
    setSheetOpen(true);
  }

  return {
    data: {
      org,
      month,
      weekdayHeaders: headers,
      slotMonths,
      facts,
      todayKey,
    },
    state: {
      visible,
      monthLabel,
      selectedDate,
      selectedDay,
      selectedSlot,
      selectedDateLabel,
      canGoBack,
      isEmpty: days.length === 0,
      sheetOpen,
      repeatServiceIds,
    },
    actions: {
      prevMonth: () => setVisible((current) => addMonths(current.year, current.month, -1)),
      nextMonth: () => setVisible((current) => addMonths(current.year, current.month, 1)),
      selectDate,
      selectSlot: setSelectedSlotId,
      openBooking: () => setSheetOpen(true),
      bookNearest,
      setSheetOpen: changeSheetOpen,
      markBooked,
    },
  };
}
