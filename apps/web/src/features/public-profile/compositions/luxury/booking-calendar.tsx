'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';

import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

import { dayAriaLabel, slotAriaLabel } from '../../engine/a11y';
import { monthKey } from '../../engine/build-calendar';
import type { CalendarSectionProps } from '../../contracts/calendar';
import { BookingFlowSheet } from './booking-sheet';
import { CAPTION_CLASS, PRIMARY_BUTTON_CLASS } from './ui';

/* Листалка месяца: квадрат в чернильной линейке, 40px в ритме сетки;
   псевдоэлемент доводит зону нажатия до 44px. */
const MONTH_NAV_CLASS =
  'luxury-action relative flex h-10 w-10 cursor-pointer items-center justify-center border border-border text-ink after:absolute after:-inset-0.5 after:content-[""] hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default disabled:opacity-35 disabled:hover:border-border';

/**
 * Секция записи мира Luxury («Bergs»): полосы разворота, разделённые
 * чернильными швами.
 *
 * На телефоне полосы идут одна за другой: «ближайшее окно» (сетка 1:1,
 * слева дата и время антиквой 40px, справа бронзовая плита «Записаться»
 * у нижнего края), затем «Расписание». С lg секция раскрывается в
 * разворот: ближайшее окно — левая страница за чернильным средником
 * (дата антиквой 56px, плита под ней), календарь — правая. «Расписание»:
 * заголовок антиквой с капс-меткой месяца, сетка календаря на голом листе
 * за чернильным швом. Ячейки плоские: день с окнами — чернь,
 * пустой — цвет тихой линейки, выбранный — единственная бронзовая заливка
 * сетки, «сегодня» отмечен чернильным контуром. Чипы времени — печатные
 * прямоугольники в тихой линейке. Смена месяца и списка слотов — медленный
 * crossfade 500ms, keyed-ремонт перезапускает его.
 *
 * Движок (`useScheduleCalendar`) отдаёт данные и действия — эта разметка
 * только одевает их (контракт §7.2).
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
      <section id="booking" className="border-b border-border-strong px-[18px] py-12 text-center">
        <p className="font-display text-[24px] [font-weight:var(--display-weight)] text-ink">
          {t.publicPage.bookingClosed}
        </p>
        <p className="mt-2 text-sm text-ink-soft">{t.publicPage.bookingClosedHint}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="booking-heading" id="booking">
      <h2 id="booking-heading" className="sr-only">
        {t.publicPage.onlineBooking}
      </h2>

      {/* С lg секция — разворот: ближайшее окно слева за чернильным
          средником, расписание справа. На телефоне полосы стоят одна за
          другой. */}
      <div className={cn(facts.nearestSlot && 'lg:grid lg:grid-cols-[2fr_3fr]')}>
        {/* Полоса «ближайшее окно»: на телефоне дата слева и бронзовая
            плита справа, полосу закрывает чернильный шов; на lg — левая
            страница разворота: дата антиквой 56px, плита под ней, всё
            прижато к разным краям колонки. */}
        {facts.nearestSlot ? (
          <div className="grid grid-cols-2 border-b border-border-strong lg:flex lg:flex-col lg:justify-between lg:gap-10 lg:border-b-0 lg:border-r lg:px-8 lg:py-9">
            <div className="border-r border-border-strong px-[18px] py-6 lg:border-r-0 lg:p-0">
              <span className={cn('block', CAPTION_CLASS)}>{t.publicPage.nearestWindow}</span>
              <span className="mt-3 block font-display text-[40px] leading-[1.05] tabular-nums [font-weight:var(--display-weight)] text-ink lg:mt-5 lg:text-[56px]">
                {facts.nearestLabel}
                <br />
                {facts.nearestSlot.time}
              </span>
            </div>
            <div className="flex items-end p-[18px] lg:p-0">
              <button
                type="button"
                onClick={actions.bookNearest}
                className={cn(PRIMARY_BUTTON_CLASS, 'w-full')}
              >
                {t.publicPage.book}
              </button>
            </div>
          </div>
        ) : null}

        {/* Полоса «Расписание». */}
        <div className="px-[18px] pb-4 pt-7 lg:min-w-0 lg:px-8 lg:py-9">
          <div className="flex items-end justify-between gap-3">
            <h3 className="min-w-0 font-display text-[30px] leading-none [font-weight:var(--display-weight)] text-ink lg:text-[36px]">
              {t.publicPage.schedule}
            </h3>
            <div className="flex shrink-0 items-center gap-3">
              <span className={CAPTION_CLASS}>{monthLabel}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!canGoBack}
                  onClick={actions.prevMonth}
                  aria-label={t.publicPage.prevMonth}
                  className={MONTH_NAV_CLASS}
                >
                  <CaretLeft size={15} weight="regular" />
                </button>
                <button
                  type="button"
                  onClick={actions.nextMonth}
                  aria-label={t.publicPage.nextMonth}
                  className={MONTH_NAV_CLASS}
                >
                  <CaretRight size={15} weight="regular" />
                </button>
              </div>
            </div>
          </div>

          {/* Сетка на голом листе за чернильным швом; keyed-ремонт
            перезапускает crossfade 500ms при смене месяца. */}
          <div
            key={`${visible.year}-${visible.month}`}
            className="anim-luxury-fade mt-5 border-t border-border-strong pt-3.5"
          >
            <div className="grid grid-cols-7">
              {weekdayHeaders.map((weekday) => (
                <span
                  key={weekday}
                  className="pb-3 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint"
                >
                  {weekday}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7" role="grid" aria-label={t.publicPage.bookingDays}>
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
                          'flex h-[42px] items-center justify-center text-sm tabular-nums',
                          cell.inMonth ? 'text-border' : 'text-border/50',
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
                        'luxury-cell flex h-[42px] cursor-pointer items-center justify-center text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                        isSelected
                          ? /* Единственная бронзовая заливка сетки — отметка
                             выбранного дня. */
                            'bg-accent font-medium text-accent-contrast'
                          : isBookable
                            ? 'font-medium text-ink hover:bg-bg-sunken'
                            : /* День без окон гаснет до цвета тихой линейки —
                               в печатной логике «пусто» читается блёклостью. */
                              'text-border',
                        /* «Сегодня» несёт чернильный контур — свободен день
                         или нет, сам он отмечен. */
                        !isSelected && cell.date === todayKey && 'border border-border-strong',
                      )}
                    >
                      {cell.dayNumber}
                    </button>
                  );
                }),
              )}
            </div>
          </div>

          {!slotMonths.has(monthKey(visible.year, visible.month)) ? (
            <p className="mt-4 text-center text-sm text-ink-soft">
              {t.publicPage.noSlotsThisMonth}
            </p>
          ) : null}

          {selectedDateLabel ? (
            <p className={cn('mt-6 border-t border-border-strong pt-3.5', CAPTION_CLASS)}>
              {fmt(t.publicPage.freeSlotsOn, { date: selectedDateLabel })}
            </p>
          ) : null}

          {/* Чипы времени — печатные прямоугольники; выбранный залит бронзой.
            Keyed-ремонт перезапускает crossfade при смене дня. */}
          <div key={selectedDate ?? 'none'} className="anim-luxury-fade mt-3 flex flex-wrap gap-2">
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
                    'luxury-cell border px-4 py-[11px] text-center text-[13px] tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    isSelected
                      ? 'border-accent bg-accent font-medium text-accent-contrast'
                      : isBooked
                        ? 'border-border/60 text-border line-through'
                        : 'cursor-pointer border-border text-ink hover:border-border-strong',
                  )}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>

          {/* Появляется вместе с выбранной датой: до неё жест записи несёт
            бронзовая плита ближайшего окна, а дежурная плашка лишь
            заслоняла бы календарь. Липкая на телефоне — страница
            скроллится, и действие обязано оставаться на месте; на десктопе
            статичная. Контейнер не перехватывает тапы: события проходят
            сквозь обёртку, кнопка забирает их обратно. Подпись называет то,
            чего не хватает, поэтому кнопка никогда не бывает тупиком. */}
          {selectedDate ? (
            <div className="pointer-events-none sticky bottom-0 z-20 -mx-[18px] mt-8 px-[18px] pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 lg:static lg:mx-0 lg:px-0 lg:pb-0 lg:pt-6">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/95 to-transparent lg:hidden" />
              <button
                type="button"
                className={cn(PRIMARY_BUTTON_CLASS, 'pointer-events-auto relative w-full')}
                onClick={actions.openBooking}
                disabled={!selectedSlot}
              >
                {!selectedSlot ? t.publicPage.pickTime : t.publicPage.book}
              </button>
            </div>
          ) : null}
        </div>
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
