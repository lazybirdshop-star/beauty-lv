'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import Link from 'next/link';

import { fmt, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { dayAriaLabel, slotAriaLabel } from '../../engine/a11y';
import { monthKey } from '../../engine/build-calendar';
import type { CalendarSectionProps } from '../../contracts/calendar';
import { BookingFlowSheet } from './booking-sheet';

/* Primary этого мира: заливка чернью, радиус 8px, надпись строчными, вес 600
   (§6 «Кнопки»). Hover светлеет заливку на ~6% за 100ms; press — без scale и
   без сдвига, отклик только цветом: инструмент не прожимается, он отвечает.
   Ни одной тени. */
const PRIMARY_BUTTON_CLASS =
  'action-fill pointer-events-auto relative h-14 w-full cursor-pointer rounded-[var(--control-radius)] text-[15px] font-semibold transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] hover:bg-[color-mix(in_srgb,var(--accent)_94%,white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:border disabled:border-border-strong disabled:bg-transparent disabled:text-ink-soft';

/**
 * Ряд фактов — одна типографская строка с линейками-разделителями (§6
 * «Композиция»): числа табличные, подписи — метки 11px `ink-faint`, левая
 * выключка, ни одной плашки. `href` превращает ячейку в ссылку, не выделяя
 * её среди соседних, — отклик только тихой заливкой на hover.
 */
function Fact({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <>
      <span className="block text-[17px] font-semibold leading-none tabular-nums text-ink">
        {value}
      </span>
      <span className="mt-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint">
        {label}
      </span>
    </>
  );
  const cellClass = 'block px-4 py-3.5 text-left first:pl-0 last:pr-0';

  if (!href) {
    return <div className={cellClass}>{body}</div>;
  }

  return (
    <Link
      href={href}
      className={cn(
        cellClass,
        'transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] hover:bg-bg-sunken',
      )}
    >
      {body}
    </Link>
  );
}

/**
 * Секция записи мира Minimal (§6 «Календарь»): сетка лежит на голом поле,
 * без подложки; ячейки 8px без рамок; выбранный день — чернильная заливка;
 * «сегодня» — точка 4px под числом; занятое — приглушение и зачёркивание
 * (закон продукта). Смена месяца и списка слотов — crossfade 120ms, keyed
 * ремонт перезапускает его. Иерархия — кеглем и полями: заголовок 20px/600,
 * подпись месяца `ink-faint`, ритм секции 48px.
 *
 * Композиция документная: сетка месяца держит читаемую ширину (≈400px —
 * пропорция живого эталона записи, Cal.com 2026), слоты идут ниже во всю
 * колонку; сплита «календарь | слоты» мягкого мира здесь нет. Движок
 * (`useScheduleCalendar`) отдаёт данные и действия — эта разметка только
 * одевает их (контракт §7.2).
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

  if (isEmpty) {
    return (
      <section id="booking" className="pb-16 pt-12">
        <div className="rounded-[var(--card-radius)] border border-border px-4 py-12 text-center">
          <p className="text-[17px] font-semibold text-ink">{t.publicPage.bookingClosed}</p>
          <p className="mt-2 text-sm text-ink-soft">{t.publicPage.bookingClosedHint}</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="booking-heading" id="booking" className="pb-4 pt-12 lg:pb-16">
      <h2 id="booking-heading" className="sr-only">
        {t.publicPage.onlineBooking}
      </h2>

      <div className="grid grid-cols-3 divide-x divide-border border-y border-border">
        {/* Ссылкой ячейка становится, только когда мастер показывает раздел
            цен, — иначе она вела бы на страницу, которую он скрыл. */}
        <Fact
          label={t.publicPage.servicesCount}
          value={String(facts.servicesCount)}
          href={org.showPricesSection ? `/${org.slug}/prices` : undefined}
        />
        <Fact label={t.publicPage.freeSlots} value={String(facts.availableCount)} />
        <Fact label={t.publicPage.nearest} value={facts.nearestLabel} />
      </div>

      <div className="mb-4 mt-12 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[20px] leading-none tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink">
            {t.publicPage.schedule}
          </h3>
          <p className="mt-1.5 truncate text-sm capitalize text-ink-faint">{monthLabel}</p>
        </div>
        {/* Листалки — контролы мира: квадраты 8px в волосяной линейке; 40px
            держат ритм сетки, псевдоэлемент доводит зону нажатия до 44px. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            disabled={!canGoBack}
            onClick={actions.prevMonth}
            aria-label={t.publicPage.prevMonth}
            className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-[var(--cell-radius)] border border-border text-ink transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] after:absolute after:-inset-0.5 after:content-[''] hover:border-border-strong disabled:cursor-default disabled:opacity-35 disabled:hover:border-border"
          >
            <CaretLeft size={16} weight="light" />
          </button>
          <button
            type="button"
            onClick={actions.nextMonth}
            aria-label={t.publicPage.nextMonth}
            className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-[var(--cell-radius)] border border-border text-ink transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] after:absolute after:-inset-0.5 after:content-[''] hover:border-border-strong disabled:cursor-default disabled:opacity-35 disabled:hover:border-border"
          >
            <CaretRight size={16} weight="light" />
          </button>
        </div>
      </div>

      {/* Голое поле: ни подложки, ни рамки вокруг сетки. Keyed ремонт
          перезапускает crossfade 120ms при смене месяца. */}
      <div
        key={`${visible.year}-${visible.month}`}
        className="anim-minimal-crossfade max-w-[400px]"
      >
        <div className="grid grid-cols-7 gap-1">
          {weekdayHeaders.map((weekday) => (
            <span
              key={weekday}
              className="pb-2 text-center text-[11px] font-medium uppercase tracking-[0.04em] text-ink-faint"
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
                    'relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[var(--cell-radius)] text-sm tabular-nums transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    isSelected
                      ? 'bg-accent font-semibold text-accent-contrast'
                      : isBookable
                        ? 'text-ink hover:bg-bg-sunken'
                        : 'text-ink-faint',
                  )}
                >
                  {cell.dayNumber}
                  {/* «Сегодня» — точка 4px под числом (§6); доступность
                      читается чернью против приглушённого и маркеров не
                      просит. */}
                  {!isSelected && cell.date === todayKey ? (
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

      {!slotMonths.has(monthKey(visible.year, visible.month)) ? (
        <p className="mt-4 max-w-[400px] rounded-[var(--card-radius)] border border-border px-4 py-4 text-center text-sm text-ink-soft">
          {t.publicPage.noSlotsThisMonth}
        </p>
      ) : null}

      <p className="mb-3 mt-6 text-sm text-ink-soft">
        {selectedDateLabel ? fmt(t.publicPage.freeSlotsOn, { date: selectedDateLabel }) : ''}
      </p>

      <div
        key={selectedDate ?? 'none'}
        className="anim-minimal-crossfade grid grid-cols-4 gap-2 sm:grid-cols-6"
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
                /* Чипы времени — та же геометрия, что у ячеек дат: 8px и
                    волосяная линейка; время и дата — одна система. */
                'rounded-[var(--chip-radius)] py-3 text-center text-sm font-medium tabular-nums transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                isSelected
                  ? 'border border-transparent bg-accent font-semibold text-accent-contrast'
                  : isBooked
                    ? 'text-ink-faint line-through'
                    : 'cursor-pointer border border-border text-ink hover:border-border-strong',
              )}
            >
              {slot.time}
            </button>
          );
        })}
      </div>

      {/*
        `sticky`, not `fixed`. The panel wrapping this content in the glass
        worlds carries `backdrop-filter`, and an element with a backdrop-filter
        becomes the containing block for `fixed` descendants. Sticky positions
        against the scrollport and is immune to that.
      */}
      {/* Липкая на телефоне — страница скроллится, и действие обязано
          оставаться на месте; на десктопе статичная: документ читается
          прокруткой, парящая плашка в нём — чужой жест. Контейнер не
          перехватывает тапы: его невидимая зона накрывала бы чипы времени
          (аудит P1-2), события проходят сквозь обёртку, кнопка забирает их
          обратно. */}
      <div className="pointer-events-none sticky bottom-0 z-20 -mx-5 mt-6 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 lg:static lg:mx-0 lg:px-0 lg:pb-0 lg:pt-0">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-bg via-bg/95 to-transparent lg:hidden" />
        {/* Подпись называет то, чего не хватает, поэтому кнопка никогда не
            бывает тупиком, который приходится разгадывать. */}
        <button
          type="button"
          className={PRIMARY_BUTTON_CLASS}
          onClick={actions.openBooking}
          disabled={!selectedSlot}
        >
          {!selectedDate
            ? t.publicPage.pickDate
            : !selectedSlot
              ? t.publicPage.pickTime
              : t.publicPage.book}
        </button>
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
