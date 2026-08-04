'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { fmt, useLocale, useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { BookingSheet } from './booking-sheet';
import {
  addMonths,
  buildMonth,
  monthKey,
  monthsWithSlots,
  WEEKDAY_HEADERS_RU,
} from '../build-calendar';
import { groupSlotsByDay } from '../group-by-day';
import type { PublicOrganization, PublishedSlot, SlotStatus } from '../types';

interface BookingCalendarProps {
  org: PublicOrganization;
  initialSlots: PublishedSlot[];
}

const DATE_LABEL_FORMATTER_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
const SHORT_DATE_FORMATTER_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
const MONTH_LABEL_FORMATTER_OPTS: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };

const FACT_CLASS = 'block rounded-2xl bg-bg-sunken/70 px-3 py-2.5 text-center lg:py-1.5';

/**
 * `href` turns the tile into a link while keeping it visually identical to
 * its neighbours — by product decision it should not stand out. Press-scale
 * and the hover background are the only feedback that it is interactive.
 */
function Fact({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <>
      <span className="block font-display text-lg leading-none text-ink lg:text-base">{value}</span>
      <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-soft">
        {label}
      </span>
    </>
  );

  if (!href) {
    return <div className={FACT_CLASS}>{body}</div>;
  }

  return (
    <Link href={href} className={cn(FACT_CLASS, 'press hover:bg-bg-sunken')}>
      {body}
    </Link>
  );
}

/**
 * The page's hero and primary conversion path: date → published slot →
 * guest details → confirm. There is no working-hours template and no slot
 * generation here on purpose — the master publishes exact windows one at a
 * time, the client only ever sees what she published (PRD.md §7.4).
 * `POST public-bookings` is real; the local `overrides` map is just
 * optimistic UI so the grid reflects "booked" instantly without a refetch.
 */
export function BookingCalendar({ org, initialSlots }: BookingCalendarProps) {
  const t = useT();
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
  const [sheetOpen, setSheetOpen] = useState(false);

  const days = useMemo(() => {
    const withOverrides = initialSlots.map((slot) => ({
      ...slot,
      status: overrides[slot.id] ?? slot.status,
    }));
    return groupSlotsByDay(withOverrides, locale);
  }, [initialSlots, overrides, locale]);

  const day = selectedDate ? days.find((entry) => entry.date === selectedDate) : undefined;
  const selectedSlot = day?.slots.find((slot) => slot.id === selectedSlotId) ?? null;

  const dateLabel = useMemo(() => {
    if (!day) return '';
    return DATE_LABEL_FORMATTER.format(new Date(`${day.date}T00:00:00`));
  }, [day, DATE_LABEL_FORMATTER]);

  /* The visible month starts wherever the first published window is, so a
     master who opened next month doesn't greet clients with an empty grid. */
  const [visible, setVisible] = useState(() => {
    const first = initialSlots[0];
    const start = first ? new Date(`${first.date}T00:00:00`) : new Date();
    return { year: start.getFullYear(), month: start.getMonth() };
  });

  const calendar = useMemo(() => buildMonth(visible.year, visible.month, days), [visible, days]);
  const slotMonths = useMemo(() => monthsWithSlots(days), [days]);

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

  const facts = useMemo(() => {
    const available = days.flatMap((entry) =>
      entry.slots.filter((slot) => slot.status === 'available'),
    );
    const nearest = available[0];
    return {
      servicesCount: org.services.length,
      availableCount: available.length,
      nearestLabel: nearest
        ? SHORT_DATE_FORMATTER.format(new Date(`${nearest.date}T00:00:00`))
        : '—',
    };
  }, [days, org.services.length, SHORT_DATE_FORMATTER]);

  function handleDateChange(date: string) {
    setSelectedDate(date);
    setSelectedSlotId(null);
  }

  function handleBooked(slotId: string) {
    setOverrides((prev) => ({ ...prev, [slotId]: 'booked' }));
  }

  if (days.length === 0) {
    return (
      <section className="px-5 pb-12 pt-6">
        <div className="rounded-3xl bg-bg-sunken/70 px-4 py-12 text-center">
          <p className="font-display text-xl text-ink">{t.publicPage.bookingClosed}</p>
          <p className="mt-2 text-sm text-ink-soft">{t.publicPage.bookingClosedHint}</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="booking-heading" className="px-5 pb-2 pt-4 lg:px-7 lg:pb-7">
      <h2 id="booking-heading" className="sr-only">
        {t.publicPage.onlineBooking}
      </h2>

      <div className="grid grid-cols-3 gap-2 lg:gap-2.5">
        {/* Only linked when the master actually shows the prices section —
            otherwise this would route clients to a page she chose to hide. */}
        <Fact
          label={t.publicPage.servicesCount}
          value={String(facts.servicesCount)}
          href={org.showPricesSection ? `/${org.slug}/prices` : undefined}
        />
        <Fact label={t.publicPage.freeSlots} value={String(facts.availableCount)} />
        <Fact label={t.publicPage.nearest} value={facts.nearestLabel} />
      </div>

      <div className="mb-4 mt-8 flex items-center justify-between gap-3 lg:mt-6">
        <div className="min-w-0">
          <h3 className="font-display text-[24px] leading-none text-ink lg:text-[20px]">
            {t.publicPage.schedule}
          </h3>
          <p className="mt-1 truncate text-sm capitalize text-ink-soft">{monthLabel}</p>
        </div>
        {/* The circles stay 40px — that size is the calendar's rhythm — while
            the pseudo-element lifts the tappable area to the 44px minimum. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            disabled={!canGoBack}
            onClick={() => setVisible((current) => addMonths(current.year, current.month, -1))}
            aria-label={t.publicPage.prevMonth}
            className="press relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-bg-sunken/70 text-ink after:absolute after:-inset-0.5 after:content-[''] disabled:cursor-default disabled:opacity-35"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setVisible((current) => addMonths(current.year, current.month, 1))}
            aria-label={t.publicPage.nextMonth}
            className="press relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-bg-sunken/70 text-ink after:absolute after:-inset-0.5 after:content-['']"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* Side by side from `lg`: the capped calendar left ~280px of dead
          space to its right, and stacking the slots underneath pushed the
          CTA past the fold. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,380px)_1fr] lg:items-start lg:gap-6">
        <div className="rounded-3xl bg-bg-sunken/50 p-3 lg:p-4">
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_HEADERS_RU.map((weekday) => (
              <span
                key={weekday}
                className="pb-1 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-soft"
              >
                {weekday}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1" role="grid" aria-label={t.publicPage.bookingDays}>
            {calendar.weeks.flatMap((week) =>
              week.cells.map((cell) => {
                const isSelected = cell.date === selectedDate;
                const isBookable = cell.availableCount > 0;

                if (!cell.day) {
                  return (
                    <span
                      key={cell.date}
                      aria-hidden="true"
                      className={cn(
                        'flex aspect-square items-center justify-center text-sm tabular-nums',
                        cell.inMonth ? 'text-ink-faint/60' : 'text-ink-faint/25',
                      )}
                    >
                      {cell.dayNumber}
                    </span>
                  );
                }

                return (
                  <button
                    key={cell.date}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${cell.dayNumber} — ${
                      isBookable
                        ? fmt(t.publicPage.slotsFree, { count: cell.availableCount })
                        : t.publicPage.allBooked
                    }`}
                    onClick={() => handleDateChange(cell.date)}
                    className={cn(
                      'press relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-full text-sm font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      isSelected
                        ? 'bg-accent text-accent-contrast shadow-lifted'
                        : isBookable
                          ? 'bg-bg-raised text-ink shadow-soft hover:bg-bg-raised/70'
                          : 'text-ink-faint',
                    )}
                  >
                    {cell.dayNumber}
                    {isBookable && !isSelected ? (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-1.5 h-1 w-1 rounded-full bg-accent"
                      />
                    ) : null}
                  </button>
                );
              }),
            )}
          </div>
        </div>

        <div>
          {!slotMonths.has(monthKey(visible.year, visible.month)) ? (
            <p className="mt-3 rounded-2xl bg-bg-sunken/70 px-4 py-4 text-center text-sm text-ink-soft">
              {t.publicPage.noSlotsThisMonth}
            </p>
          ) : null}

          <p className="mb-3 mt-5 text-sm text-ink-soft lg:mt-0">
            {dateLabel ? fmt(t.publicPage.freeSlotsOn, { date: dateLabel }) : ''}
          </p>

          <div className="grid grid-cols-4 gap-2 lg:grid-cols-3 lg:gap-2">
            {day?.slots.map((slot) => {
              const isBooked = slot.status === 'booked';
              const isSelected = slot.id === selectedSlotId;
              return (
                <button
                  key={slot.id}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={isBooked}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={cn(
                    /* Same face/size as the calendar day cells — times and dates
                   are one system, they shouldn't read as two. */
                    'press rounded-full py-3 text-center text-sm font-semibold tabular-nums',
                    isSelected
                      ? 'bg-accent text-accent-contrast shadow-lifted'
                      : isBooked
                        ? 'bg-bg-sunken/50 text-ink-faint line-through'
                        : 'cursor-pointer bg-bg-sunken/80 text-ink hover:bg-bg-sunken',
                  )}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/*
        `sticky`, not `fixed`. The panel wrapping this content carries
        `backdrop-filter` for its frosted look, and an element with a
        backdrop-filter becomes the containing block for `fixed` descendants
        — so the button was pinned to the bottom of the panel, not the
        viewport, and only appeared after scrolling all the way down.
        Sticky positions against the scrollport and is immune to that.
      */}
      {/* Sticky on a phone, where the page scrolls and the action has to stay
          reachable. Static from `lg`: `sticky bottom-0` pins to the bottom of
          the *scrollport*, but the panel ends 40px higher because the layout
          container is padded — so the button hung past the panel's edge. The
          desktop page fits without scrolling, so stickiness buys nothing
          there anyway. */}
      <div className="sticky bottom-0 z-20 -mx-5 mt-6 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 lg:static lg:-mx-7 lg:mt-5 lg:px-7 lg:pb-0 lg:pt-0">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-bg via-bg/90 to-transparent lg:hidden" />
        {/* No longer gated on picking a window first. The visit's length
            decides which windows can be offered at all, so the flow asks for
            services and then shows the times that actually fit; a window
            tapped here is carried in as a preference. */}
        <Button
          size="default"
          className="press relative h-14 w-full shadow-lifted"
          onClick={() => setSheetOpen(true)}

          disabled={!selectedSlot}
        >
          {/* The label states the one thing still missing, so the button is
              never a dead end the visitor has to decode. */}
          {!selectedDate
            ? t.publicPage.pickDate
            : !selectedSlot
              ? t.publicPage.pickTime
              : t.publicPage.book}
        </Button>
      </div>

      <BookingSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        org={org}
        preferredSlot={selectedSlot}
        slotChosen={Boolean(selectedSlot)}
        onBooked={handleBooked}
      />
    </section>
  );
}
