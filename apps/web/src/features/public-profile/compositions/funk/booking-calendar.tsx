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
  FOCUS_RING_INSET,
  HEADING_CLASS,
  LABEL_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  STICKER_CLASS,
} from './ui';

/* Листалка месяца — лаймовый блок 32px; зона нажатия доведена до 44px. */
const MONTH_NAV_CLASS = `funk-press relative flex h-8 w-8 cursor-pointer items-center justify-center border-[length:var(--rule-width)] border-solid border-ink bg-accent text-sm font-black text-ink shadow-[2px_2px_0_var(--ink)] after:absolute after:-inset-1.5 after:content-[""] ${FOCUS_RING} disabled:pointer-events-none disabled:opacity-35`;

/**
 * Секция записи мира FUNK (`brutal.html`, вид `home`): плита ближайшего
 * окна, календарь-чертёж, слоты и плита фактов.
 *
 * Плита — лаймовое поле с розовой меткой, наехавшей на верхний край, и
 * мигающей чернильной точкой: час набран крупнее всего на экране, потому
 * что за ним и приходят. Дата стоит обводкой, час — заливкой: приём
 * `.slot-time span` файла наоборот, потому что читать нужно час.
 *
 * Календарь — белый блок с чернильным контуром; день это квадрат, выбранный
 * залит чернью с лаймовой цифрой и розовой тенью. Занятый слот зачёркнут и
 * несёт пунктирный контур вместо тени — «сюда нельзя» сказано материалом.
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
      <section id="booking" className="px-[18px] pt-7 lg:px-10">
        <div className="funk-block anim-funk-pop px-6 py-14 text-center">
          <p className={HEADING_CLASS}>{t.publicPage.bookingClosed}</p>
          <p className="mt-3 font-mono text-xs text-ink-soft">{t.publicPage.bookingClosedHint}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="booking-heading"
      id="booking"
      className="px-[18px] lg:grid lg:grid-cols-[1.02fr_.98fr] lg:items-start lg:gap-x-[30px] lg:px-10"
    >
      <h2 id="booking-heading" className="sr-only">
        {t.publicPage.onlineBooking}
      </h2>

      {/* Плита ближайшего окна — `.slot` файла. */}
      <div className="anim-funk-pop lg:col-start-1 lg:row-start-1" style={cascade(1)}>
        <div className="funk-block relative mt-[22px] bg-accent px-[18px] pb-[18px] pt-[22px]">
          <span className={cn(STICKER_CLASS, 'absolute -top-3 right-3.5 rotate-2')}>
            {t.publicPage.nearest}
          </span>

          <div className={cn('flex items-center gap-2 text-ink', LABEL_CLASS)}>
            <span aria-hidden="true" className="funk-live h-2 w-2 shrink-0 bg-ink" />
            {t.publicPage.nearestWindow}
          </div>

          <p className="mt-2 font-display text-[clamp(2rem,10vw,2.75rem)] font-black uppercase leading-none tracking-[-0.04em] text-ink lg:text-[56px]">
            {facts.nearestSlot ? (
              <>
                {/* Зазор задан отступом, а не пробелом: трекинг −0.04em
                    съедает пробел почти целиком, и «5 АВГ.» с часом
                    слипались в одно слово. */}
                <span className="funk-outline mr-2.5">{facts.nearestLabel}</span>
                {facts.nearestSlot.time}
              </>
            ) : (
              facts.nearestLabel
            )}
          </p>

          <p className="mt-2 font-mono text-[10.5px] text-ink">
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
            className={cn(SECONDARY_BUTTON_CLASS, 'mt-4 h-[50px] w-full')}
          >
            {t.publicPage.book} →
          </button>
        </div>
      </div>

      {/* Плита фактов — `.plate` файла с меткой, наехавшей на угол. */}
      <div className="anim-funk-pop lg:col-start-1 lg:row-start-2" style={cascade(2)}>
        <div className="funk-block relative mt-[26px] px-[18px] pb-[18px] pt-6">
          <span className={cn(STICKER_CLASS, 'absolute -top-3.5 left-4 -rotate-2')}>
            {t.publicPage.servicesAndPrices}
          </span>
          <div className="flex flex-wrap gap-2.5 pt-1.5">
            <span className="-rotate-1 border-2 border-solid border-ink bg-bg px-3 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink">
              {t.publicPage.servicesCount}: {facts.servicesCount}
            </span>
            <span className="rotate-1 border-2 border-solid border-ink bg-accent px-3 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink">
              {t.publicPage.freeSlots}: {facts.availableCount}
            </span>
          </div>
        </div>
      </div>

      <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
        <div
          className="anim-funk-pop flex items-center justify-between gap-3 pb-3 pt-7"
          style={cascade(3)}
        >
          <h3 className={HEADING_CLASS}>{t.publicPage.schedule}</h3>
        </div>

        {/* Календарный лист — крупнейший объект секции. */}
        <div className="funk-block anim-funk-pop px-3.5 pb-3.5 pt-4" style={cascade(4)}>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-display text-lg font-black uppercase tracking-[-0.02em] text-ink first-letter:uppercase">
              {monthLabel}
            </span>
            <div className="flex gap-1.5">
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

          <div key={`${visible.year}-${visible.month}`} className="anim-funk-pop">
            <div className="grid grid-cols-7 border-b-2 border-solid border-ink pb-2">
              {weekdayHeaders.map((weekday) => (
                <span
                  key={weekday}
                  className="text-center font-mono text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-faint"
                >
                  {weekday}
                </span>
              ))}
            </div>

            <div
              className="grid grid-cols-7 gap-[5px] pt-2.5"
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
                          'flex aspect-square items-center justify-center border-2 border-solid border-transparent font-mono text-xs font-bold tabular-nums',
                          cell.inMonth ? 'text-ink-faint/60' : 'text-transparent',
                          cell.date === todayKey && 'border-[var(--accent-to,var(--accent))]',
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
                        'funk-press flex aspect-square cursor-pointer items-center justify-center border-2 border-solid font-mono text-xs font-bold tabular-nums',
                        FOCUS_RING_INSET,
                        isSelected
                          ? 'border-ink bg-ink text-accent shadow-[3px_3px_0_var(--accent-to,var(--accent))]'
                          : isBookable
                            ? 'border-transparent text-ink hover:border-ink'
                            : 'border-transparent text-ink-faint/60',
                        !isSelected &&
                          cell.date === todayKey &&
                          'border-[var(--accent-to,var(--accent))] text-[var(--accent-text-to,var(--accent))]',
                      )}
                    >
                      {cell.dayNumber}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        </div>

        {!slotMonths.has(monthKey(visible.year, visible.month)) ? (
          <p className="funk-block mt-4 px-4 py-3.5 text-center font-mono text-xs text-ink-soft">
            {t.publicPage.noSlotsThisMonth}
          </p>
        ) : null}

        {selectedDay ? (
          <div className="anim-funk-pop">
            <p className={cn('py-4', LABEL_CLASS)}>
              {selectedDateLabel
                ? `// ${fmt(t.publicPage.freeSlotsOn, { date: selectedDateLabel })}`
                : `// ${t.publicPage.pickDate}`}
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
                      'anim-funk-pop funk-press h-[46px] border-[length:var(--rule-width)] border-solid border-ink font-mono text-xs font-bold tabular-nums',
                      FOCUS_RING,
                      isSelected
                        ? 'bg-ink text-accent shadow-[3px_3px_0_var(--accent-to,var(--accent))]'
                        : isBooked
                          ? 'border-dashed text-ink-faint/70 line-through'
                          : 'cursor-pointer bg-bg-raised text-ink shadow-[3px_3px_0_var(--ink)]',
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
        `sticky`, а не `fixed`: у мира нет `backdrop-filter`, но правило то
        же, что и везде в коллекции, — липкая капсула позиционируется от
        скроллпорта и не зависит от предков. На развороте она садится в
        поток: парящая плашка на широком экране была бы чужим жестом.
        Подпись называет то, чего не хватает, поэтому кнопка не бывает
        тупиком.
      */}
      <div className="pointer-events-none sticky bottom-0 z-30 mt-7 pb-[env(safe-area-inset-bottom)] lg:static lg:col-span-2 lg:pb-0">
        <div className="pointer-events-auto border-t-[length:var(--rule-width)] border-solid border-ink bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] px-0 pb-4 pt-2.5 lg:border-0 lg:bg-transparent lg:p-0">
          <p className="mb-2 min-h-4 text-center font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent-text-to,var(--accent))]">
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
                : `${t.publicPage.book} →`}
          </button>
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
