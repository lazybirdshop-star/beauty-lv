'use client';

import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react';
import Link from 'next/link';
import { useState } from 'react';

import { fmt, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { dayAriaLabel, slotAriaLabel } from '../../engine/a11y';
import { monthKey } from '../../engine/build-calendar';
import type { CalendarSectionProps } from '../../contracts/calendar';
import { BookingFlowSheet } from './booking-sheet';
import { cascade, FOCUS_RING, FOCUS_RING_INSET, LABEL_CLASS, PRIMARY_BUTTON_CLASS } from './ui';

/* Листалка месяца — круглая стеклянная кнопка 40px в ритме сетки;
   псевдоэлемент доводит зону нажатия до честных 44px. */
const MONTH_NAV_CLASS = `neo-glass-pane neo-glass-action neo-glass-lift relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink after:absolute after:-inset-0.5 after:content-[""] ${FOCUS_RING} disabled:pointer-events-none disabled:opacity-35`;

/* Заливка «выбрано»: бирюза с тем же верхним бликом, что несут стеклянные
   поверхности мира, — выбранная ячейка остаётся объектом, а не пятном. */
const SELECTED_FILL = 'bg-accent bg-[image:var(--surface-sheen)] text-accent-contrast';

/**
 * Факт-капсула ряда (§9 «Композиция»): три равных стеклянных объекта без
 * главного среди них. `href` делает капсулу ссылкой, `onClick` — кнопкой;
 * форма и вес при этом не меняются, иначе ряд перестал бы читаться как три
 * равных.
 */
function Fact({
  label,
  value,
  href,
  onClick,
  actionLabel,
  delay,
}: {
  label: string;
  value: string;
  href?: string;
  onClick?: () => void;
  actionLabel?: string;
  delay: number;
}) {
  const body = (
    <>
      {/* Кегль факта считается от ширины экрана: «10 февр.» шире любого
          числа, и фиксированный размер либо рвал бы дату на две строки,
          либо держал числа мельче, чем они заслуживают. */}
      <span className="block whitespace-nowrap font-display text-[clamp(1rem,4.6vw,1.375rem)] leading-none tabular-nums [font-weight:var(--display-weight)] text-ink">
        {value}
      </span>
      {/* Подпись переносится, а не обрезается: «свободно окон» в трети
          телефонной ширины не помещается в строку ни при каком кегле, а
          усечённое «свободно…» перестаёт быть подписью. */}
      <span className={cn('mt-2 block text-[10px] leading-[1.3]', LABEL_CLASS)}>{label}</span>
    </>
  );
  const cellClass =
    'anim-neo-glass-materialize neo-glass-pane flex h-full flex-col items-center justify-start rounded-[var(--card-radius)] px-2.5 py-4 text-center';

  if (href) {
    return (
      <Link
        href={href}
        style={cascade(delay)}
        className={cn(cellClass, 'neo-glass-action neo-glass-lift', FOCUS_RING)}
      >
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={actionLabel}
        style={cascade(delay)}
        className={cn(cellClass, 'neo-glass-action neo-glass-lift cursor-pointer', FOCUS_RING)}
      >
        {body}
      </button>
    );
  }

  return (
    <div style={cascade(delay)} className={cellClass}>
      {body}
    </div>
  );
}

/**
 * Секция записи мира Neo Glass (§9 «Композиция», «Календарь»): россыпь
 * парящих объектов вместо одного листа.
 *
 * Ряд фактов — три равные стеклянные капсулы. Первая ведёт в прайс, когда
 * мастер его показывает; третья не повторяет календарь пассивно, а
 * записывает на ближайшее окно — тот же жест, что «Записаться», просто без
 * выбора даты.
 *
 * Календарь — крупный стеклянный лист 28px, парящий на амбайенте; ячейки —
 * непрерывные 12px squircle. Выбранный день залит бирюзой с верхним бликом,
 * «сегодня» отмечен кромкой акцента, занятое приглушено. Смена месяца —
 * направленный сдвиг 24px с fade на пружинной кривой: следующий месяц
 * приходит справа, предыдущий слева. Слоты приходят каскадом 30ms
 * поп-масштабом `scale(0.9) → 1`.
 *
 * Липкая CTA — стеклянная капсула, летящая над контентом; ей не нужен
 * градиентный скрим, потому что размытие стекла и есть тот слой, сквозь
 * который видно страницу.
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

  /* Направление сдвига — чисто визуальное состояние, поэтому живёт здесь, а
     не в контракте движка (§3): месяц движок отдаёт, а откуда он приехал —
     вопрос хореографии. Правка состояния прямо в рендере — тот самый
     случай, для которого React её и держит: он выбрасывает текущий вывод и
     пересчитывает компонент до коммита, поэтому кадра со старым
     направлением не бывает. */
  const monthIndex = visible.year * 12 + visible.month;
  const [pager, setPager] = useState({ month: monthIndex, direction: 'next' as 'next' | 'prev' });
  if (pager.month !== monthIndex) {
    setPager({ month: monthIndex, direction: monthIndex > pager.month ? 'next' : 'prev' });
  }

  if (isEmpty) {
    return (
      <section id="booking" className="pt-3.5">
        <div className="neo-glass-pane anim-neo-glass-materialize rounded-[var(--panel-radius)] px-5 py-14 text-center">
          <p className="font-display text-[20px] [font-weight:var(--display-weight)] text-ink">
            {t.publicPage.bookingClosed}
          </p>
          <p className="mt-2.5 text-sm text-ink-soft">{t.publicPage.bookingClosedHint}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="booking-heading"
      id="booking"
      className="flex flex-col gap-3.5 pt-3.5"
    >
      <h2 id="booking-heading" className="sr-only">
        {t.publicPage.onlineBooking}
      </h2>

      <div className="grid grid-cols-3 gap-2.5">
        {/* Ссылкой капсула становится, только когда мастер показывает раздел
            цен, — иначе она вела бы на страницу, которую он скрыл. */}
        <Fact
          label={t.publicPage.servicesCount}
          value={String(facts.servicesCount)}
          href={org.showPricesSection ? `/${org.slug}/prices` : undefined}
          delay={4}
        />
        <Fact label={t.publicPage.freeSlots} value={String(facts.availableCount)} delay={5} />
        {/* Имя капсулы называет объект, а не действие: «Записаться» на
            экране одно, и это нижняя капсула — второе такое же имя сделало
            бы две разные кнопки неразличимыми на слух. */}
        <Fact
          label={t.publicPage.nearest}
          value={facts.nearestLabel}
          onClick={facts.nearestSlot ? actions.bookNearest : undefined}
          actionLabel={
            facts.nearestSlot
              ? `${t.publicPage.nearestWindow} — ${facts.nearestLabel}, ${slotAriaLabel(facts.nearestSlot, t)}`
              : undefined
          }
          delay={6}
        />
      </div>

      <div
        className="anim-neo-glass-materialize mt-3 flex items-end justify-between gap-3"
        style={cascade(7)}
      >
        <div className="min-w-0">
          <h3 className="font-display text-[24px] leading-none tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink">
            {t.publicPage.schedule}
          </h3>
          <p className="mt-2 truncate text-[13px] capitalize text-ink-soft">{monthLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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

      {/* Календарный лист — крупнейший объект секции. Keyed-ремонт
          перезапускает направленный сдвиг при смене месяца. */}
      <div
        className="anim-neo-glass-materialize neo-glass-pane overflow-hidden rounded-[var(--panel-radius)] p-3 sm:p-4"
        style={cascade(8)}
      >
        <div
          key={`${visible.year}-${visible.month}`}
          className={
            pager.direction === 'next' ? 'anim-neo-glass-month-next' : 'anim-neo-glass-month-prev'
          }
        >
          <div className="grid grid-cols-7">
            {weekdayHeaders.map((weekday) => (
              <span
                key={weekday}
                className="pb-2.5 text-center text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint"
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
                        'mx-auto flex h-11 w-full max-w-[56px] items-center justify-center rounded-[var(--cell-radius)] text-sm tabular-nums sm:h-12',
                        cell.inMonth ? 'text-ink-faint/70' : 'text-ink-faint/35',
                        /* «Сегодня» отмечено кромкой акцента и в день без
                           окон: кольцо говорит «вы здесь», а не «нажмите» —
                           за нажимаемость отвечает яркость числа. */
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
                      /* Ячейка держит собственный размер, а не долю ширины:
                         на десктопе колонка шире 90px, и квадрат от ширины
                         растягивал лист в поле пустоты, а заливка «выбрано»
                         превращалась из непрерывного 12px-угла в широкую
                         плашку. 44px честной зоны остаются на всех
                         вьюпортах, колонки просто дышат шире. */
                      'neo-glass-action mx-auto flex h-11 w-full max-w-[56px] cursor-pointer items-center justify-center rounded-[var(--cell-radius)] text-sm tabular-nums sm:h-12',
                      FOCUS_RING_INSET,
                      isSelected
                        ? cn(SELECTED_FILL, 'font-semibold')
                        : isBookable
                          ? 'text-ink hover:bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]'
                          : /* День без окон гаснет: в тёмном мире «пусто»
                               читается тем, что объект не набирает света. */
                            'text-ink-faint/60',
                      /* «Сегодня» несёт кромку акцента — свободен день или
                         нет, сам он отмечен. */
                      !isSelected && cell.date === todayKey && 'border border-accent text-ink',
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
        <p className="neo-glass-pane rounded-[var(--card-radius)] px-4 py-3.5 text-center text-sm text-ink-soft">
          {t.publicPage.noSlotsThisMonth}
        </p>
      ) : null}

      {selectedDateLabel ? (
        <p className={cn('mt-2', LABEL_CLASS)}>
          {fmt(t.publicPage.freeSlotsOn, { date: selectedDateLabel })}
        </p>
      ) : null}

      {/* Чипы времени — стекло 12px; выбранный залит бирюзой с бликом.
          Keyed-ремонт перезапускает каскад при смене дня. */}
      <div key={selectedDate ?? 'none'} className="flex flex-wrap gap-2">
        {selectedDay?.slots.map((slot, index) => {
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
                'anim-neo-glass-pop neo-glass-action rounded-[var(--chip-radius)] px-4 py-[11px] text-center text-[13px] tabular-nums',
                FOCUS_RING,
                isSelected
                  ? cn(SELECTED_FILL, 'font-semibold')
                  : isBooked
                    ? 'text-ink-faint/60 line-through'
                    : 'neo-glass-pane neo-glass-lift cursor-pointer text-ink',
              )}
            >
              {slot.time}
            </button>
          );
        })}
      </div>

      {/*
        `sticky`, а не `fixed`: стеклянные поверхности этого мира несут
        `backdrop-filter`, а элемент с backdrop-filter становится
        containing block для `fixed`-потомков. Sticky позиционируется
        относительно скроллпорта и к этому невосприимчив.

        Капсула летит над контентом на телефоне и садится в поток на
        десктопе: там страница читается прокруткой, и парящая плашка была бы
        чужим жестом. Обёртка не перехватывает тапы — события проходят
        сквозь неё, кнопка забирает их обратно. Подпись называет то, чего не
        хватает, поэтому кнопка никогда не бывает тупиком.
      */}
      <div className="pointer-events-none sticky bottom-4 z-20 mt-2 pb-[env(safe-area-inset-bottom)] lg:static lg:pb-0">
        <button
          type="button"
          className={cn(PRIMARY_BUTTON_CLASS, 'pointer-events-auto w-full')}
          onClick={actions.openBooking}
          disabled={!selectedSlot}
        >
          <CalendarBlank size={18} weight="regular" aria-hidden="true" />
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
