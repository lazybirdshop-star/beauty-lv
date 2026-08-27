'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import Link from 'next/link';

import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { dayAriaLabel, slotAriaLabel } from '../../engine/a11y';
import { monthKey } from '../../engine/build-calendar';
import type { CalendarSectionProps } from '../../contracts/calendar';
import { BookingFlowSheet } from './booking-sheet';

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
 * The state underneath — month, selection, optimistic "booked" marks, the
 * sheet's open — is the shared engine's `useScheduleCalendar`; this file is
 * the soft world's composition of it.
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

  if (isEmpty) {
    return (
      <section className="px-5 pb-12 pt-6">
        <div className="rounded-[var(--card-radius)] bg-bg-sunken/70 px-4 py-12 text-center">
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
          {/* `first-letter`, а не `capitalize`: русская подпись месяца это два
              слова — «август 2026 г.», — и `capitalize` поднимает заглавную в
              каждом, выдавая «Август 2026 Г.». Заглавная нужна ровно одна, в
              начале строки. Правку сделали в `aura`, `funk`, `minimal` и
              `poster`, а до мира, который получает каждый новый мастер, она
              не дошла. */}
          <p className="mt-1 truncate text-sm text-ink-soft first-letter:uppercase">{monthLabel}</p>
        </div>
        {/* The circles stay 40px — that size is the calendar's rhythm — while
            the pseudo-element lifts the tappable area to the 44px minimum. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            disabled={!canGoBack}
            onClick={actions.prevMonth}
            aria-label={t.publicPage.prevMonth}
            className="press relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-bg-sunken/70 text-ink after:absolute after:-inset-0.5 after:content-[''] disabled:cursor-default disabled:opacity-35"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={actions.nextMonth}
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
        <div className="rounded-[var(--card-radius)] bg-bg-sunken/50 p-3 lg:p-4">
          <div key={`${visible.year}-${visible.month}`}>
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

            <div
              className="grid grid-cols-7 gap-1"
              role="grid"
              aria-label={t.publicPage.bookingDays}
            >
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
                        'press relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[var(--cell-radius)] text-sm font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                        isSelected
                          ? 'bg-accent text-accent-contrast shadow-lifted'
                          : isBookable
                            ? 'bg-bg-raised text-ink shadow-soft hover:bg-bg-raised/70'
                            : 'text-ink-faint',
                      )}
                    >
                      {cell.dayNumber}
                      {/* The soft worlds mark availability with the dot. */}
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
        </div>

        <div>
          {!slotMonths.has(monthKey(visible.year, visible.month)) ? (
            <p className="mt-3 rounded-2xl bg-bg-sunken/70 px-4 py-4 text-center text-sm text-ink-soft">
              {t.publicPage.noSlotsThisMonth}
            </p>
          ) : null}

          <p className="mb-3 mt-5 text-sm text-ink-soft lg:mt-0">
            {selectedDateLabel ? fmt(t.publicPage.freeSlotsOn, { date: selectedDateLabel }) : ''}
          </p>

          <div
            key={selectedDate ?? 'none'}
            className="grid grid-cols-4 gap-2 lg:grid-cols-3 lg:gap-2"
          >
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
                    'press rounded-[var(--chip-radius)] py-3 text-center text-sm font-semibold tabular-nums',
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
      {/* The container itself must not intercept taps: its invisible padding
          zone (~100px tall, full width) sat over the time chips above the
          button and swallowed the tap, so a slot under it could not be picked
          (audit P1-2). Events pass through the wrapper; the button takes them
          back. */}
      <div className="pointer-events-none sticky bottom-0 z-20 -mx-5 mt-6 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 lg:static lg:-mx-7 lg:mt-5 lg:px-7 lg:pb-0 lg:pt-0">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-bg via-bg/95 to-transparent lg:hidden" />
        {/* No longer gated on picking a window first. The visit's length
            decides which windows can be offered at all, so the flow asks for
            services and then shows the times that actually fit; a window
            tapped here is carried in as a preference. */}
        <Button
          size="default"
          className="action-fill press pointer-events-auto relative h-14 w-full shadow-lifted"
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
        /* Корзина прошлого визита, если человек пришёл из кабинета по
           «повторить». В обычном случае пусто, и запись открывается с
           выбора услуг, как раньше. */
        initialServiceIds={state.repeatServiceIds}
        org={org}
        preferredSlot={selectedSlot}
        slotChosen={Boolean(selectedSlot)}
        onBooked={actions.markBooked}
      />
    </section>
  );
}
