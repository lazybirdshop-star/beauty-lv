'use client';

import { fmt, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { CalendarSectionProps } from '../../contracts/calendar';
import { dayAriaLabel, slotAriaLabel } from '../../engine/a11y';
import { monthKey } from '../../engine/build-calendar';

import { BookingFlowSheet } from './booking-sheet';
import {
  cascade,
  FOCUS_RING,
  HEADING_CLASS,
  LABEL_CLASS,
  LIVE_DOT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from './ui';

/* Листалка месяца — круг 32px на подложке `--fill`; зона нажатия 44px. */
const MONTH_NAV_CLASS = `min-press relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-bg-sunken text-sm text-ink after:absolute after:-inset-1.5 after:content-[""] ${FOCUS_RING} disabled:pointer-events-none disabled:opacity-35`;

/**
 * Секция записи мира MINIMAL (`minimal.html`, вид `home`): плита ближайшего
 * окна, календарь, слоты и факты.
 *
 * Плита — белая карточка со скруглением 30px и синим свечением в верхнем
 * углу: час набран крупнее всего на экране и покрашен синим, потому что за
 * ним и приходят, а дата рядом остаётся чернью.
 *
 * День календаря — круг: свободный прозрачен, сегодняшний синий с точкой
 * под цифрой, выбранный залит чернью. Занятый слот зачёркнут и не несёт
 * подложки вовсе — «сюда нельзя» сказано отсутствием объекта, а не
 * дополнительной краской.
 *
 * На развороте мир раскладывается в две колонки, как `@media (min-width:
 * 900px)` файла: плита и факты слева, расписание справа.
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
      <section id="booking" className="px-[22px] pt-7 lg:px-10">
        <div className="min-card anim-minimal-rise px-6 py-14 text-center">
          <p className={HEADING_CLASS}>{t.publicPage.bookingClosed}</p>
          <p className="mt-3 text-sm text-ink-soft">{t.publicPage.bookingClosedHint}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="booking-heading"
      id="booking"
      className="px-[22px] lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8 lg:px-10"
    >
      <h2 id="booking-heading" className="sr-only">
        {t.publicPage.onlineBooking}
      </h2>

      {/* Плита ближайшего окна — `.slot` файла. */}
      <div className="anim-minimal-rise lg:col-start-1 lg:row-start-1" style={cascade(1)}>
        <div className="min-card min-glow relative mt-[22px] overflow-hidden px-[22px] pb-6 pt-6 lg:rounded-[var(--panel-radius)]">
          <div className={cn('flex items-center gap-2', LABEL_CLASS)}>
            <span aria-hidden="true" className={LIVE_DOT_CLASS} />
            {t.publicPage.nearestWindow}
          </div>

          <p className="mt-2 font-display text-[clamp(2rem,9vw,2.375rem)] font-bold leading-[1.05] tracking-[-0.045em] text-ink lg:text-[46px]">
            {facts.nearestSlot ? (
              <>
                {facts.nearestLabel}, <span className="text-accent">{facts.nearestSlot.time}</span>
              </>
            ) : (
              facts.nearestLabel
            )}
          </p>

          <p className="mt-1.5 text-[13px] tracking-[-0.01em] text-ink-soft">
            {fmt(t.publicPage.slotsFree, { count: facts.availableCount })}
          </p>

          <button
            type="button"
            onClick={actions.bookNearest}
            disabled={!facts.nearestSlot}
            aria-label={
              facts.nearestSlot
                ? `${t.publicPage.nearestWindow} — ${facts.nearestLabel}, ${slotAriaLabel(facts.nearestSlot, t)}`
                : undefined
            }
            className={cn(SECONDARY_BUTTON_CLASS, 'mt-[18px] h-12 w-full')}
          >
            {t.publicPage.book}
          </button>
        </div>
      </div>

      {/* Факты — ряд чипов на подложке `--fill` (`.chips` файла). */}
      <div className="anim-minimal-rise lg:col-start-1 lg:row-start-2" style={cascade(2)}>
        <div className="flex flex-wrap gap-2 pt-7">
          <span className="rounded-full bg-bg-sunken px-4 py-[11px] text-[13px] font-medium tracking-[-0.01em] text-ink">
            {t.publicPage.servicesCount}: {facts.servicesCount}
          </span>
          <span className="rounded-full bg-bg-sunken px-4 py-[11px] text-[13px] font-medium tracking-[-0.01em] text-ink">
            {t.publicPage.freeSlots}: {facts.availableCount}
          </span>
        </div>
      </div>

      <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
        <div
          className="anim-minimal-rise flex items-baseline justify-between gap-3 pb-3.5 pt-[30px]"
          style={cascade(3)}
        >
          {/* Приписки с месяцем здесь нет намеренно: файл ставит в заголовок
              короткое «август», а в карточку — «Август 2026», и это разные
              строки. У нас месяц один (`monthLabel`), и напечатанный дважды
              в двадцати пикселях друг от друга он читается опечаткой, а не
              ритмом. Месяц называет карточка — она сразу под заголовком. */}
          <h3 className={HEADING_CLASS}>{t.publicPage.schedule}</h3>
        </div>

        {/* Календарный лист — крупнейший объект секции. */}
        <div className="min-card anim-minimal-rise px-[18px] pb-[18px] pt-5" style={cascade(4)}>
          <div className="mb-3.5 flex items-center justify-between px-0.5">
            <span className="font-display text-lg font-bold tracking-[-0.03em] text-ink first-letter:uppercase">
              {monthLabel}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canGoBack}
                onClick={actions.prevMonth}
                aria-label={t.publicPage.prevMonth}
                className={MONTH_NAV_CLASS}
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                type="button"
                onClick={actions.nextMonth}
                aria-label={t.publicPage.nextMonth}
                className={MONTH_NAV_CLASS}
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>

          <div key={`${visible.year}-${visible.month}`} className="anim-minimal-rise">
            <div className="mb-2 grid grid-cols-7">
              {weekdayHeaders.map((weekday) => (
                <span
                  key={weekday}
                  className="text-center text-[10.5px] font-semibold uppercase text-ink-soft"
                >
                  {weekday}
                </span>
              ))}
            </div>

            <div
              className="grid grid-cols-7 gap-y-[5px]"
              role="grid"
              aria-label={t.publicPage.bookingDays}
            >
              {month.weeks.flatMap((week) =>
                week.cells.map((cell) => {
                  const isSelected = cell.date === selectedDate;
                  const isBookable = cell.availableCount > 0;
                  const isToday = cell.date === todayKey;

                  if (!cell.day) {
                    return (
                      <span
                        key={cell.date}
                        aria-hidden="true"
                        className={cn(
                          'flex aspect-square items-center justify-center text-[14.5px] tracking-[-0.02em]',
                          cell.inMonth ? 'text-border-strong' : 'text-transparent',
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
                        'min-press relative flex aspect-square cursor-pointer items-center justify-center rounded-[var(--cell-radius)] text-[14.5px] tracking-[-0.02em]',
                        FOCUS_RING,
                        isSelected
                          ? 'bg-ink font-bold text-bg-raised shadow-[0_10px_20px_-8px_color-mix(in_srgb,var(--ink)_50%,transparent)]'
                          : isBookable
                            ? 'font-medium text-ink hover:bg-bg-sunken'
                            : 'font-medium text-border-strong',
                        !isSelected && isToday && 'font-bold text-accent',
                      )}
                    >
                      {cell.dayNumber}
                      {/* Точка под сегодняшним числом — `.d.today::after`. */}
                      {isToday ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            'absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full',
                            isSelected ? 'bg-bg-raised' : 'bg-accent',
                          )}
                        />
                      ) : null}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        </div>

        {!slotMonths.has(monthKey(visible.year, visible.month)) ? (
          <p className="min-card mt-4 px-4 py-3.5 text-center text-[13px] text-ink-soft">
            {t.publicPage.noSlotsThisMonth}
          </p>
        ) : null}

        {selectedDay ? (
          <div className="anim-minimal-rise">
            <p className={cn('py-4', LABEL_CLASS)}>
              {selectedDateLabel
                ? fmt(t.publicPage.freeSlotsOn, { date: selectedDateLabel })
                : t.publicPage.pickDate}
            </p>

            <div key={selectedDate ?? 'none'} className="grid grid-cols-3 gap-[9px]">
              {selectedDay.slots.map((slot, index) => {
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
                    style={cascade(index)}
                    className={cn(
                      'anim-minimal-rise min-press h-11 rounded-[var(--chip-radius)] text-sm font-semibold tracking-[-0.02em]',
                      FOCUS_RING,
                      isSelected
                        ? 'bg-[var(--action-bg)] text-[var(--action-ink)] shadow-[0_10px_22px_-8px_color-mix(in_srgb,var(--accent)_55%,transparent)]'
                        : isBooked
                          ? 'text-border-strong line-through'
                          : 'cursor-pointer bg-bg-sunken text-ink',
                    )}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/*
        `sticky`, а не `fixed`: липкая капсула позиционируется от скроллпорта
        и не зависит от предков. На развороте она садится в поток — парящая
        плашка на широком экране была бы чужим жестом. Подпись называет то,
        чего не хватает, поэтому кнопка не бывает тупиком.
      */}
      <div className="pointer-events-none sticky bottom-0 z-30 mt-8 pb-[env(safe-area-inset-bottom)] lg:static lg:col-span-2 lg:pb-0">
        <div className="min-frost pointer-events-auto border-t border-solid border-border px-0 pb-5 pt-3 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-filter-none">
          <p className="mb-2 min-h-4 text-center text-xs font-semibold tracking-[-0.01em] text-accent">
            {selectedSlot && selectedDateLabel ? `${selectedDateLabel} · ${selectedSlot.time}` : ''}
          </p>
          <button
            type="button"
            className={cn(PRIMARY_BUTTON_CLASS, 'w-full')}
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
