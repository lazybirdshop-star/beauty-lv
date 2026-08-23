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
} from './ui';

/* Листалка месяца — круглая кнопка 32px по кадру файла; псевдоэлемент
   доводит зону нажатия до честных 44px. */
const MONTH_NAV_CLASS = `aura-action relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-[color-mix(in_srgb,var(--surface-tint,var(--bg-raised))_70%,transparent)] text-ink after:absolute after:-inset-1.5 after:content-[""] ${FOCUS_RING} disabled:pointer-events-none disabled:opacity-35`;

/**
 * Секция записи мира AURA (`aura.html`, вид `home`): плита ближайшего окна,
 * расписание, слоты, плита фактов и плавающая капсула действия.
 *
 * Плита ближайшего окна — первое, что читается после имени: время набрано
 * градиентом и крупнее всего на экране, потому что человек, пришедший из
 * Instagram ночью, ищет именно его. Она же и есть действие: нажатие
 * записывает на это окно, не заставляя искать его в календаре.
 *
 * Календарь — стеклянный лист 36px; день это круг, слот — капсула. Занятый
 * слот зачёркнут и не гаснет до неразличимости: «занято» тоже информация.
 *
 * Плита фактов внизу — тот же `.plate` файла: там перечислено, что входит в
 * стоимость, здесь — сколько у мастера услуг и сколько окон открыто. Это
 * единственное место, где разметка мира наполнена не тем, чем в файле:
 * список включённого продукт не хранит, а придумывать его за мастера
 * нельзя.
 *
 * На десктопе (≥lg) мир раскладывается в две колонки, как `@media
 * (min-width: 900px)` файла: плита и факты слева, расписание справа.
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
      <section id="booking" className="pt-6">
        <div className="aura-veil anim-aura-rise rounded-[var(--panel-radius)] px-6 py-14 text-center">
          <p className={HEADING_CLASS}>{t.publicPage.bookingClosed}</p>
          <p className="mt-2.5 text-sm text-ink-soft">{t.publicPage.bookingClosedHint}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="booking-heading"
      id="booking"
      className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-7"
    >
      <h2 id="booking-heading" className="sr-only">
        {t.publicPage.onlineBooking}
      </h2>

      {/* Плита ближайшего окна — `.slot` файла: живая точка, время
          градиентом, дата подписью и действие под ними. */}
      <div className="anim-aura-rise lg:col-start-1 lg:row-start-1" style={cascade(2)}>
        <div className="aura-veil relative mt-[22px] overflow-hidden rounded-[var(--panel-radius)] px-[22px] pb-[22px] pt-[26px] text-center">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-[20%] -top-1/2 h-[120%] w-[140%] bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent)_18%,transparent),transparent_60%)]"
          />
          <div className={cn('relative flex items-center justify-center gap-2', LABEL_CLASS)}>
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-success shadow-[0_0_10px_var(--success)]"
            />
            {t.publicPage.nearestWindow}
          </div>

          {/*
            Дата обычным начертанием, время — градиентом и полужирным: приём
            `.slot-time` файла, где герой-число это «Today · 15:30».
            Человек, пришедший из Instagram ночью, ищет здесь именно час, а
            не число месяца, — поэтому час набран тем, что читается первым.
            Кегль считается от ширины: «понедельник · 15:30» шире любой
            короткой даты, и фиксированные 38px рвали бы строку надвое.
          */}
          <p className="relative mt-3 font-display text-[clamp(1.75rem,8vw,2.375rem)] leading-none tracking-[-0.02em] [font-weight:var(--display-weight)] text-ink lg:text-[44px]">
            {facts.nearestSlot ? (
              <>
                {facts.nearestLabel}{' '}
                <span aria-hidden="true" className="text-ink-faint">
                  ·
                </span>{' '}
                <b className="aura-grad-text font-semibold">{facts.nearestSlot.time}</b>
              </>
            ) : (
              /* Окон нет вовсе — тогда единственное, что можно сказать,
                 говорится градиентом: пустая плита выглядела бы поломкой. */
              <b className="aura-grad-text font-semibold">{facts.nearestLabel}</b>
            )}
          </p>

          <p className="relative mt-1.5 text-xs font-light text-ink-soft">
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
            className={cn(SECONDARY_BUTTON_CLASS, 'relative mt-[18px] h-[50px] w-full')}
          >
            {t.publicPage.book}
          </button>
        </div>
      </div>

      {/* Плита фактов — `.plate` файла: спокойный ряд капсул, не действие. */}
      <div className="anim-aura-rise lg:col-start-1 lg:row-start-2" style={cascade(3)}>
        <div className="aura-veil mt-[26px] rounded-[var(--panel-radius)] px-5 py-6">
          <p className={cn('text-center', LABEL_CLASS)}>{t.publicPage.servicesAndPrices}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <span className="rounded-full border border-border bg-[color-mix(in_srgb,var(--surface-tint,var(--bg-raised))_55%,transparent)] px-[15px] py-2.5 text-xs font-normal text-ink">
              {t.publicPage.servicesCount}: {facts.servicesCount}
            </span>
            <span className="rounded-full border border-border bg-[color-mix(in_srgb,var(--surface-tint,var(--bg-raised))_55%,transparent)] px-[15px] py-2.5 text-xs font-normal text-ink">
              {t.publicPage.freeSlots}: {facts.availableCount}
            </span>
          </div>
        </div>
      </div>

      <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
        {/* Месяц назван один раз — в шапке листа, где стоят и стрелки.
            Вторая его копия здесь спорила бы с первой ровно тогда, когда
            человек листает. */}
        <div className="anim-aura-rise px-0.5 pb-3 pt-8" style={cascade(4)}>
          <h3 className={HEADING_CLASS}>{t.publicPage.schedule}</h3>
        </div>

        {/* Календарный лист — крупнейший объект секции. */}
        <div
          className="aura-veil anim-aura-rise rounded-[var(--panel-radius)] px-[18px] pb-4 pt-5"
          style={cascade(5)}
        >
          <div className="mb-3 flex items-center justify-between px-1">
            {/* `first-letter`, а не `capitalize`: русская подпись месяца это
                два слова — «август 2026 г.», — и `capitalize` поднимает
                заглавную в каждом, выдавая «Август 2026 Г.». Заглавная нужна
                ровно одна, в начале строки. */}
            <span className="text-base font-semibold tracking-[-0.01em] text-ink first-letter:uppercase">
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
                <span aria-hidden="true" className="text-[13px] leading-none">
                  ‹
                </span>
              </button>
              <button
                type="button"
                onClick={actions.nextMonth}
                aria-label={t.publicPage.nextMonth}
                className={MONTH_NAV_CLASS}
              >
                <span aria-hidden="true" className="text-[13px] leading-none">
                  ›
                </span>
              </button>
            </div>
          </div>

          {/* Календарь этого мира не сдвигает месяцы вбок — он их
              растворяет; ключ переигрывает вход на каждой смене. */}
          <div key={`${visible.year}-${visible.month}`} className="anim-aura-rise">
            <div className="mb-2 grid grid-cols-7">
              {weekdayHeaders.map((weekday) => (
                <span
                  key={weekday}
                  className="text-center text-[9px] font-medium uppercase tracking-[0.16em] text-ink-faint"
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

                  if (!cell.day) {
                    return (
                      <span
                        key={cell.date}
                        aria-hidden="true"
                        className={cn(
                          'mx-auto flex aspect-square w-full max-w-[42px] items-center justify-center rounded-[var(--cell-radius)] text-[13.5px] tabular-nums',
                          cell.inMonth ? 'text-ink-faint/70' : 'text-transparent',
                          cell.date === todayKey && 'border border-accent/60',
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
                        'aura-action mx-auto flex aspect-square w-full max-w-[42px] cursor-pointer items-center justify-center rounded-[var(--cell-radius)] text-[13.5px] tabular-nums',
                        FOCUS_RING_INSET,
                        isSelected
                          ? 'aura-grad font-semibold text-[var(--action-ink)] shadow-[0_12px_24px_-8px_color-mix(in_srgb,var(--accent)_70%,transparent)]'
                          : isBookable
                            ? 'text-ink hover:bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]'
                            : 'text-ink-faint/60',
                        !isSelected &&
                          cell.date === todayKey &&
                          'border border-accent font-semibold text-accent',
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
          <p className="aura-veil mt-4 rounded-[var(--card-radius)] px-4 py-3.5 text-center text-sm text-ink-soft">
            {t.publicPage.noSlotsThisMonth}
          </p>
        ) : null}

        {/* Слоты — `.times` файла: три колонки капсул, занятые зачёркнуты. */}
        {selectedDay ? (
          <div className="anim-aura-rise">
            <p className={cn('px-6 pb-2.5 pt-5 text-center', LABEL_CLASS)}>
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
                    style={{ animationDelay: `${index * 30}ms` }}
                    className={cn(
                      'anim-aura-pop aura-action h-[46px] rounded-[var(--chip-radius)] text-[13px] font-medium tabular-nums',
                      FOCUS_RING,
                      isSelected
                        ? 'bg-ink text-bg shadow-[0_12px_24px_-10px_color-mix(in_srgb,var(--ink)_50%,transparent)]'
                        : isBooked
                          ? 'text-ink-faint/70 line-through'
                          : 'aura-veil cursor-pointer text-ink',
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
        `sticky`, а не `fixed`: стеклянные поверхности этого мира несут
        `backdrop-filter`, а элемент с backdrop-filter становится containing
        block для `fixed`-потомков. Sticky позиционируется относительно
        скроллпорта и к этому невосприимчив.

        Капсула летит над содержимым на телефоне и садится в поток на
        десктопе: там страница читается прокруткой, и парящая плашка была бы
        чужим жестом. Обёртка не перехватывает тапы — события проходят
        сквозь неё, кнопка забирает их обратно. Подпись называет то, чего не
        хватает, поэтому кнопка никогда не бывает тупиком.
      */}
      <div className="pointer-events-none sticky bottom-3.5 z-30 mt-6 pb-[env(safe-area-inset-bottom)] lg:static lg:col-span-2 lg:pb-0">
        <div className="aura-veil pointer-events-auto flex flex-col rounded-[var(--control-radius)] p-[7px]">
          {selectedSlot && selectedDateLabel ? (
            <p className="pb-1.5 pt-1 text-center text-[10.5px] font-medium tracking-[0.1em] text-accent">
              {selectedDateLabel} · {selectedSlot.time}
            </p>
          ) : null}
          <button
            type="button"
            className={cn(PRIMARY_BUTTON_CLASS, 'h-[52px] w-full')}
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
