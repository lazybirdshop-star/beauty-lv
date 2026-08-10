'use client';

import { ArrowRight, CaretLeft, CaretRight } from '@phosphor-icons/react';
import Link from 'next/link';

import { fmt, useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { dayAriaLabel, slotAriaLabel } from '../../engine/a11y';
import { monthKey } from '../../engine/build-calendar';
import type { CalendarSectionProps } from '../../contracts/calendar';
import { BookingFlowSheet } from './booking-sheet';

const FACT_CLASS = 'block rounded-2xl bg-bg-sunken/70 px-3 py-2.5 text-center lg:py-1.5';

/* The card photograph's vignette — a lighter hand than the hero's: the
   portrait shares the slab with ivory, it only needs to belong to the
   dark world, not to sink into it. */
const LUXURY_CARD_VIGNETTE =
  'radial-gradient(130% 115% at 50% 40%, transparent 50%, color-mix(in srgb, var(--bg) 55%, transparent) 100%)';

/* Luxury's facts are one typographic line (§7, по референсу): a serif
   numeral with the caption in caps beside it, divided by vertical
   hairlines — no tiles, no fills. */
function LuxuryFact({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <span className="flex items-baseline gap-2.5 px-4 py-4">
      <span className="font-display text-[28px] leading-none tabular-nums text-ink">{value}</span>
      <span className="text-[10px] font-semibold uppercase leading-snug tracking-[0.12em] text-ink-faint">
        {label}
      </span>
    </span>
  );
  if (!href) return <div>{body}</div>;
  return (
    <Link href={href} className="luxury-action block hover:bg-bg-raised">
      {body}
    </Link>
  );
}

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
 * the soft world's composition of it (Luxury branches included).
 */
export function BookingCalendar({ data, state, actions }: CalendarSectionProps) {
  const t = useT();
  const { org, month, weekdayHeaders, slotMonths, facts, todayKey } = data;
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

  /* The Luxury world (§7): dark 2px cells with quiet rules, the chosen day
     filled with gold under an ink digit, today ringed in champagne, and the
     month changing in a slow 500ms crossfade. It drops the sunken calendar
     backing, and the pager's face is its own champagne outline. */
  const luxury = org.designPresetKey === 'luxury';

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
    <section
      aria-labelledby="booking-heading"
      className={cn(
        'px-5 pb-2 lg:px-7 lg:pb-7',
        /* The section rhythm is the world's own: the widest air of the six
           (56–64px) in Luxury (§7 «Композиция»). */
        luxury ? 'pt-14 lg:pt-12' : 'pt-4',
      )}
    >
      <h2 id="booking-heading" className="sr-only">
        {t.publicPage.onlineBooking}
      </h2>

      {/* Luxury's first act (§7, референс): the nearest window as the one
          light slab in the dark world — ivory ground, the serif date and
          time, the underlined caps action; the master's photograph keeps
          the right half. */}
      {luxury && facts.nearestSlot ? (
        <div className={cn('grid', org.showAvatar && org.logoUrl ? 'grid-cols-2' : 'grid-cols-1')}>
          <button
            type="button"
            onClick={actions.bookNearest}
            className="luxury-action block bg-ink p-5 text-left text-bg"
          >
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-bg/60">
              {t.publicPage.nearestWindow}
            </span>
            <span aria-hidden="true" className="mt-2 block h-px w-10 bg-bg/25" />
            <span className="mt-4 block font-display text-[32px] uppercase leading-[1.05] tabular-nums">
              {facts.nearestLabel}
            </span>
            <span className="block font-display text-[32px] leading-[1.05] tabular-nums">
              {facts.nearestSlot.time}
            </span>
            <span className="mt-5 inline-flex items-center gap-2 border-b border-bg/40 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
              {t.publicPage.book}
              <ArrowRight size={13} className="text-accent" aria-hidden="true" />
            </span>
          </button>
          {org.showAvatar && org.logoUrl ? (
            <div className="relative min-h-[220px] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={org.logoUrl}
                alt=""
                loading="lazy"
                className="anim-luxury-settle absolute inset-0 h-full w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ backgroundImage: LUXURY_CARD_VIGNETTE }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {luxury ? (
        /* The typographic fact line: serif numerals, caps captions,
           vertical hairlines between (§7, референс). The nearest window
           lives in the ivory slab above, so the row carries two facts. */
        <div className="mt-10 grid grid-cols-2 divide-x divide-border border-y border-border">
          <LuxuryFact
            label={t.publicPage.servicesCount}
            value={String(facts.servicesCount)}
            href={org.showPricesSection ? `/${org.slug}/prices` : undefined}
          />
          <LuxuryFact label={t.publicPage.freeSlots} value={String(facts.availableCount)} />
        </div>
      ) : (
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
      )}

      <div
        className={cn(
          'flex items-center justify-between gap-3',
          luxury ? 'mb-5 mt-14 lg:mt-12' : 'mb-4 mt-8 lg:mt-6',
        )}
      >
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
            onClick={actions.prevMonth}
            aria-label={t.publicPage.prevMonth}
            className={cn(
              "press relative flex h-10 w-10 cursor-pointer items-center justify-center text-ink after:absolute after:-inset-0.5 after:content-[''] disabled:cursor-default disabled:opacity-35",
              luxury
                ? 'rounded-[var(--cell-radius)] border border-border transition-colors duration-[var(--dur-hover)] hover:border-border-strong'
                : 'rounded-full bg-bg-sunken/70',
            )}
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={actions.nextMonth}
            aria-label={t.publicPage.nextMonth}
            className={cn(
              "press relative flex h-10 w-10 cursor-pointer items-center justify-center text-ink after:absolute after:-inset-0.5 after:content-['']",
              luxury
                ? 'rounded-[var(--cell-radius)] border border-border transition-colors duration-[var(--dur-hover)] hover:border-border-strong'
                : 'rounded-full bg-bg-sunken/70',
            )}
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* Side by side from `lg`: the capped calendar left ~280px of dead
          space to its right, and stacking the slots underneath pushed the
          CTA past the fold. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,380px)_1fr] lg:items-start lg:gap-6">
        <div
          className={luxury ? undefined : 'rounded-[var(--card-radius)] bg-bg-sunken/50 p-3 lg:p-4'}
        >
          {/* Luxury keeps the bare field and slows the month change to the
              cinematic 500ms (§7). The keyed remount is what retriggers it. */}
          <div
            key={`${visible.year}-${visible.month}`}
            className={luxury ? 'anim-luxury-fade' : undefined}
          >
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
                        luxury && 'luxury-cell border',
                        isSelected
                          ? luxury
                            ? /* The gold field is the whole mark — no rule
                                 around it (a no-op where cells carry none). */
                              'border-transparent bg-accent text-accent-contrast'
                            : 'bg-accent text-accent-contrast shadow-lifted'
                          : isBookable
                            ? luxury
                              ? /* The chosen day is gold under an ink digit;
                                   the fill takes the measured 240ms (§7). */
                                'border-border bg-bg-raised text-ink hover:border-border-strong'
                              : 'bg-bg-raised text-ink shadow-soft hover:bg-bg-raised/70'
                            : luxury
                              ? 'border-border/60 text-ink-faint'
                              : 'text-ink-faint',
                        /* «Сегодня» wears the champagne ring (§7) — available
                           or not, the day itself is marked. */
                        luxury && !isSelected && cell.date === todayKey && 'border-border-strong',
                      )}
                    >
                      {cell.dayNumber}
                      {/* The soft worlds mark availability with the dot.
                          Luxury uses neither — availability reads through ink
                          against faint, and today carries the champagne ring. */}
                      {!luxury && isBookable && !isSelected ? (
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
            <p
              className={cn(
                'mt-3 px-4 py-4 text-center text-sm text-ink-soft',
                luxury
                  ? 'rounded-[var(--card-radius)] border border-border'
                  : 'rounded-2xl bg-bg-sunken/70',
              )}
            >
              {t.publicPage.noSlotsThisMonth}
            </p>
          ) : null}

          <p className="mb-3 mt-5 text-sm text-ink-soft lg:mt-0">
            {selectedDateLabel ? fmt(t.publicPage.freeSlotsOn, { date: selectedDateLabel }) : ''}
          </p>

          <div
            key={selectedDate ?? 'none'}
            className={cn(
              'grid grid-cols-4 gap-2 lg:grid-cols-3 lg:gap-2',
              luxury && 'anim-luxury-fade',
            )}
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
                    luxury && 'luxury-cell border',
                    isSelected
                      ? luxury
                        ? 'border-transparent bg-accent text-accent-contrast'
                        : 'bg-accent text-accent-contrast shadow-lifted'
                      : isBooked
                        ? luxury
                          ? 'border-border/60 text-ink-faint line-through'
                          : 'bg-bg-sunken/50 text-ink-faint line-through'
                        : luxury
                          ? /* Rectangles in a quiet rule; the chosen one is
                               gold (§7). */
                            'cursor-pointer border-border text-ink hover:border-border-strong'
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
          className={cn(
            'press pointer-events-auto relative h-14 w-full',
            luxury
              ? /* The one gold rectangle on the screen: caps at the
                   world's 0.16em, the velvet shadow kept, hover and press
                   on the world's own timing (§7). */
                'luxury-action text-[13px] font-semibold uppercase tracking-[var(--action-tracking)] shadow-lifted'
              : 'shadow-lifted',
          )}
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
