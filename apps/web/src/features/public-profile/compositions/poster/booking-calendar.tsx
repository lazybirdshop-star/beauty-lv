'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import Link from 'next/link';

import { fmt, useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { dayAriaLabel, slotAriaLabel } from '../../engine/a11y';
import { monthKey } from '../../engine/build-calendar';
import type { CalendarSectionProps } from '../../contracts/calendar';
import { BookingFlowSheet } from './booking-sheet';

// Ruled fields, not tinted tiles: the poster world divides space with rules.
const FACT_CLASS = 'card block px-3 py-2.5 text-center';

/**
 * `href` turns a field into a link while keeping it visually identical to its
 * neighbour — by product decision it must not stand out from the pair.
 */
function Fact({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <>
      <span className="block font-display text-lg font-extrabold leading-none text-ink">
        {value}
      </span>
      <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </span>
    </>
  );

  if (!href) return <div className={FACT_CLASS}>{body}</div>;
  return (
    <Link href={href} className={cn(FACT_CLASS, 'press hover:border-accent')}>
      {body}
    </Link>
  );
}

/**
 * The page's hero and primary conversion path: date → published slot →
 * guest details → confirm. There is no working-hours template and no slot
 * generation here on purpose — the master publishes exact windows one at a
 * time, the client only ever sees what she published (PRD.md §7.4).
 * The state underneath — month, selection, optimistic "booked" marks, the
 * sheet's open — is the shared engine's `useScheduleCalendar`; this file is
 * the poster world's composition of it.
 */
export function BookingCalendar({ data, state, actions }: CalendarSectionProps) {
  const t = useT();
  const { org, month, weekdayHeaders, slotMonths, facts } = data;
  const {
    visible,
    monthLabel,
    selectedDate,
    selectedDay,
    selectedSlot,
    selectedDateLabel,
    canGoBack,
    isEmpty,
    sheetOpen,
  } = state;
  const { nearestSlot } = facts;

  if (isEmpty) {
    return (
      <section className="px-5 pb-12 pt-6">
        <div className="card px-4 py-12 text-center">
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

      {/* The nearest free window, and it is the action. The label is set on
          its own ruled line rather than floating directly above the display
          figure — asked for by the master, kept as a printed field caption so
          it reads as part of the block instead of a stray kicker. */}
      {nearestSlot ? (
        <button
          type="button"
          onClick={actions.bookNearest}
          className="press mb-3 block w-full bg-accent px-4 py-4 text-left text-accent-contrast"
        >
          <span className="block border-b border-accent-contrast/30 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-90">
            {t.publicPage.nearestWindow}
          </span>
          <span className="mt-3 flex items-baseline justify-between gap-3">
            <span className="flex flex-col font-display text-[30px] font-extrabold uppercase leading-[0.95] tracking-[-0.02em] sm:flex-row sm:items-baseline sm:gap-3">
              <span>{facts.nearestLabel}</span>
              <span className="tabular-nums">{nearestSlot.time}</span>
            </span>
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em]">
              {t.publicPage.book} →
            </span>
          </span>
        </button>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Fact
          label={t.publicPage.servicesCount}
          value={String(facts.servicesCount)}
          href={`/${org.slug}/prices`}
        />
        <Fact label={t.publicPage.freeSlots} value={String(facts.availableCount)} />
      </div>

      <div className="mb-4 mt-8 flex items-center justify-between gap-3 lg:mt-6">
        <div className="min-w-0">
          <h3 className="font-display text-[24px] leading-none text-ink lg:text-[20px]">
            {t.publicPage.schedule}
          </h3>
          <p className="mt-1 truncate text-sm first-letter:uppercase text-ink-soft">{monthLabel}</p>
        </div>
        {/* The circles stay 40px — that size is the calendar's rhythm — while
            the pseudo-element lifts the tappable area to the 44px minimum. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            disabled={!canGoBack}
            onClick={actions.prevMonth}
            aria-label={t.publicPage.prevMonth}
            className="press relative flex h-10 w-10 cursor-pointer items-center justify-center border border-border-strong text-ink after:absolute after:-inset-0.5 after:content-[''] hover:border-accent disabled:cursor-default disabled:opacity-35"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={actions.nextMonth}
            aria-label={t.publicPage.nextMonth}
            className="press relative flex h-10 w-10 cursor-pointer items-center justify-center border border-border-strong text-ink after:absolute after:-inset-0.5 after:content-[''] hover:border-accent"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* Side by side from `lg`: the capped calendar left ~280px of dead
          space to its right, and stacking the slots underneath pushed the
          CTA past the fold. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,380px)_1fr] lg:items-start lg:gap-6">
        <div className="card p-3 lg:p-4">
          <div className="grid grid-cols-7 gap-1">
            {weekdayHeaders.map((weekday) => (
              <span
                key={weekday}
                className="pb-1 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-soft"
              >
                {weekday}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1" role="grid" aria-label={t.publicPage.bookingDays}>
            {month.weeks.flatMap((week) =>
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
                    aria-label={dayAriaLabel(cell, t)}
                    onClick={() => actions.selectDate(cell.date)}
                    className={cn(
                      'press relative flex aspect-square cursor-pointer flex-col items-center justify-center text-sm font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      isSelected
                        ? 'bg-accent text-accent-contrast'
                        : isBookable
                          ? 'bg-bg-raised text-ink hover:bg-bg-sunken'
                          : 'text-ink-faint',
                    )}
                  >
                    {cell.dayNumber}
                    {isBookable && !isSelected ? (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-1.5 h-1 w-1.5 bg-accent"
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
            <p className="mt-3 border border-border px-4 py-4 text-center text-sm text-ink-soft">
              {t.publicPage.noSlotsThisMonth}
            </p>
          ) : null}

          <p className="mb-3 mt-5 text-sm text-ink-soft lg:mt-0">
            {selectedDateLabel ? fmt(t.publicPage.freeSlotsOn, { date: selectedDateLabel }) : ''}
          </p>

          <div className="grid grid-cols-4 gap-2 lg:grid-cols-3 lg:gap-2">
            {selectedDay?.slots.map((slot) => {
              const isBooked = slot.status === 'booked';
              const isSelected = slot.id === selectedSlot?.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={slotAriaLabel(slot, t)}
                  disabled={isBooked}
                  onClick={() => actions.selectSlot(slot.id)}
                  className={cn(
                    /* Same face/size as the calendar day cells — times and dates
                   are one system, they shouldn't read as two. */
                    'press field py-3 text-center text-sm font-semibold tabular-nums',
                    isSelected
                      ? 'border-accent bg-accent text-accent-contrast'
                      : isBooked
                        ? 'border-border/60 text-ink-faint line-through'
                        : 'cursor-pointer border-border-strong text-ink hover:border-accent hover:text-accent',
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
      {/* No sticky bar. THESIS refuses it by name, and it duplicated the
          vermilion field above, which already is the action. The picker is
          reachable from that field and from every service row. */}
      <div className="mt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          size="default"
          className="press h-14 w-full rounded-none text-[13px] uppercase tracking-[0.14em]"
          onClick={actions.openBooking}
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

      <BookingFlowSheet
        open={sheetOpen}
        onOpenChange={actions.setSheetOpen}
        org={org}
        preferredSlot={selectedSlot}
        slotChosen={Boolean(selectedSlot)}
        onBooked={actions.markBooked}
      />
    </section>
  );
}
