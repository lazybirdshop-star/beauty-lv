'use client';

/**
 * Сетка календаря — Design System V2 §6: пять состояний времени, каждое
 * различимо без опоры на цвет.
 *
 * Шкала часов слева и N колонок справа; получас равен `--slot-h` пикселям
 * регистра (`DENSITY`), записи стоят на своих местах и своей высоты. Время
 * вне рабочих часов утоплено тоном: мастер обязана видеть не только когда
 * она занята, но и когда её вообще нет, — иначе пустая клетка в восемь утра
 * читается как свободное окно.
 *
 * **Колонка — не обязательно день.** Тот же экран показывает неделю по дням и
 * день по мастерам (спецификация §12, SALON.md §8.5); устройство сетки при этом
 * одно, и второй её экземпляр разошёлся бы с первым в первую же правку. Что в
 * колонке, решает `GridColumn`, где что стоит — `buildCalendarModel`.
 *
 * **Сетка — своя прокручиваемая поверхность.** Шапка с именами прилипает к
 * верху, шкала часов — к левому краю: у салона на пятнадцать мастеров сетка
 * шире экрана, и администратор, пролиставшая к 18:00 и вправо к Софии, обязана
 * по-прежнему видеть, чья это колонка и который час.
 *
 * **Руками.** На большом экране по пустому месту можно протянуть отрезок, а
 * визит — перенести во времени, в другой день или к другому мастеру
 * (`useGridDrag`). У каждого движения есть путь нажатием — меню пустого места
 * и перенос в карточке визита, — поэтому клавиатура и телефон ничего не теряют.
 *
 * Состояния времени: занято — ниша `--bg-inset` с полосой услуги; свободно —
 * розовый предмет с пилюлей «Открыть»; скрытое окно — плоский тон и
 * перечёркнутый глаз; заблокировано — утопленный тон без полосы и обводки;
 * пусто — чистая поверхность. Ждущая запись не залита — пунктир янтарём.
 * Выбранный визит поднимается (правило 03), пока открыта его карточка.
 */
import type { CSSProperties } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { FreeTime } from '@/components/cabinet/free-time';
import { ServiceBar } from '@/components/cabinet/service-bar';
import type { Booking } from '@/features/bookings/types';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { MemberAvatar } from '@/features/dashboard-shell/components/member-avatar';
import { useNarrow } from '@/features/dashboard-shell/use-narrow';
import { serviceTone } from '@/features/services/service-tone';
import { initials } from '@/lib/avatar';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { CalendarEntry, GridColumn } from '../calendar-columns';
import {
  DENSITY,
  SLOT_MINUTES,
  buildCalendarModel,
  clock,
  holesIn,
  hourPxOf,
  lanes,
  minutesOfDay,
} from '../calendar-model';
import type { MinuteRange } from '../grid-geometry';
import { useGridDrag } from '../use-grid-drag';

export type { CalendarEntry, GridColumn };

/** Что можно делать руками — только на большом экране и только с правом. */
export interface GridInteractions {
  canMove: (entry: CalendarEntry) => boolean;
  canDropInto: (entry: CalendarEntry, column: GridColumn) => boolean;
  onRange: (column: GridColumn, range: MinuteRange, rect: DOMRect) => void;
  onMove: (entry: CalendarEntry, column: GridColumn, at: number) => void;
}

/** Регистр плотности (handoff §3.9): плотный — командный день. */
export type GridDensity = 'spacious' | 'compact';

/** Сколько минут занимает блок визита минимум — иначе имя режется по буквам. */
const MIN_BLOCK_MINUTES = SLOT_MINUTES;

export function CalendarGrid({
  columns,
  entries,
  timeZone,
  variant = 'days',
  density = 'spacious',
  selectedBookingId = null,
  interactions,
  onSelectBooking,
  onSelectSlot,
  onSelectEmpty,
  onSelectBlock,
}: {
  columns: GridColumn[];
  entries: CalendarEntry[];
  timeZone: string;
  /** `team` — колонка человек: у неё всегда есть шапка с именем, даже если колонка одна. */
  variant?: 'days' | 'team';
  density?: GridDensity;
  /** Визит, чья карточка открыта, — поднимается над остальными. */
  selectedBookingId?: string | null;
  interactions?: GridInteractions;
  onSelectBooking: (booking: Booking) => void;
  /** Нажатие по свободному окну — его карточка: перенести, скрыть, удалить. */
  onSelectSlot: (slotId: string) => void;
  /** Нажатие по пустому месту — действие на это время; прямоугольник — куда привязать меню. */
  onSelectEmpty: (column: GridColumn, minutes: number, rect: DOMRect) => void;
  /** Нажатие по заблокированному времени — его карточка. */
  onSelectBlock: (blockId: string) => void;
}) {
  const t = useT();
  const narrow = useNarrow();
  const scroller = useRef<HTMLDivElement>(null);
  const columnNodes = useRef<(HTMLDivElement | null)[]>([]);

  /* Один источник геометрии: число из `DENSITY` уходит и в перетаскивание, и
     в `--slot-h`, который читает CSS. Телефон всегда просторный. */
  const slotPx = narrow
    ? DENSITY.phone
    : density === 'compact'
      ? DENSITY.compact
      : DENSITY.spacious;
  const hourPx = hourPxOf(slotPx);
  const register: GridDensity = narrow ? 'spacious' : density;

  /* Черта «сейчас» тикает раз в минуту — секундная точность на шкале, где час
     равен полусотне пикселей, не значит ничего. */
  const [now, setNow] = useState<{ key: string; minutes: number } | null>(null);
  useEffect(() => {
    const tick = () => {
      const iso = new Date().toISOString();
      const key = new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso));
      setNow({ key, minutes: minutesOfDay(iso, timeZone) });
    };
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, [timeZone]);

  const model = useMemo(
    () => buildCalendarModel(columns, entries, timeZone),
    [columns, entries, timeZone],
  );

  const px = (minutes: number) => ((minutes - model.start) / 60) * hourPx;

  const { drag, startSelect, startMove, consumeClick } = useGridDrag({
    enabled: Boolean(interactions),
    start: model.start,
    end: model.end,
    hourPx,
    columnRects: () =>
      columns.map(
        (_, index) => columnNodes.current[index]?.getBoundingClientRect() ?? new DOMRect(),
      ),
    scroller: () => scroller.current,
    canMove: (entry) => interactions?.canMove(entry) ?? false,
    canDropInto: (entry, index) => {
      const column = columns[index];
      return Boolean(column && interactions?.canDropInto(entry, column));
    },
    onSelect: (index, range, rect) => {
      const column = columns[index];
      if (column) interactions?.onRange(column, range, rect);
    },
    onMove: (entry, index, at) => {
      const column = columns[index];
      if (column) interactions?.onMove(entry, column, at);
    },
  });

  /*
   * Высота поверхности — до низа окна, а не числом.
   *
   * Над сеткой разное: шапка, панель, фильтр людей, баннер объявления. Число,
   * подобранное под один экран, на другом оставляло бы либо полосу пустоты,
   * либо вторую прокрутку страницы поверх прокрутки сетки.
   */
  useLayoutEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const measure = () => {
      const top = node.getBoundingClientRect().top + window.scrollY;
      node.style.setProperty('--cal-top', `${Math.round(top) + 24}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  /*
   * Первый взгляд — на то, что сейчас.
   *
   * Сетка открывалась на восьми утра, и в три часа дня администратор начинала
   * каждый заход с прокрутки. Прокручивается один раз на показанный набор
   * колонок: перелистнули день — снова к делу; тикнула минута — нет.
   */
  const scrolledFor = useRef<string | null>(null);
  const shownKey = columns.map((column) => `${column.key}@${column.dateKey}`).join('|');
  const firstWork = useMemo(() => {
    let earliest: number | null = null;
    for (const laid of model.byColumn.values()) {
      const from = laid.work[0]?.from;
      if (from !== undefined && (earliest === null || from < earliest)) earliest = from;
    }
    return earliest;
  }, [model]);

  useEffect(() => {
    const node = scroller.current;
    if (!node || !now || scrolledFor.current === shownKey) return;
    scrolledFor.current = shownKey;
    const showsToday = columns.some((column) => column.dateKey === now.key);
    const target = showsToday ? now.minutes - 90 : (firstWork ?? model.start);
    node.scrollTop = Math.max(0, ((target - model.start) / 60) * hourPx - 8);
  }, [shownKey, now, columns, firstWork, model.start, hourPx]);

  const cardClass =
    variant === 'team'
      ? 'card cal-card cal-card--team'
      : columns.length === 1
        ? 'card cal-card cal-card--day'
        : 'card cal-card';

  const showsToday = now !== null && columns.some((column) => column.dateKey === now.key);
  const nowInRange = now !== null && now.minutes > model.start && now.minutes < model.end;

  const duration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h && m) return `${h} ${t.common.hoursShort} ${m} ${t.common.minutesShort}`;
    if (h) return `${h} ${t.common.hoursShort}`;
    return `${m} ${t.common.minutesShort}`;
  };

  return (
    /* Число колонок и шаг сетки уезжают в CSS-переменные: у «дня», «недели»
       и «команды» одна и та же сетка, и повторять её устройство в разметке —
       верный способ однажды показать семь колонок для одного дня. */
    <div
      className={cardClass}
      data-density={register}
      style={{ '--cal-days': columns.length, '--slot-h': `${slotPx}px` } as CSSProperties}
    >
      <div className={drag ? 'cal-scroll is-dragging' : 'cal-scroll'} ref={scroller}>
        <div className="cal-head">
          <span className="cal-gutter-head" />
          {columns.map((column) =>
            column.person ? (
              <div className="cal-day-head cal-person-head" key={column.key}>
                <MemberAvatar
                  className="cal-person-head__avatar"
                  name={column.person.name}
                  seed={column.key}
                  url={column.person.avatarUrl}
                  focal={column.person.avatarFocal}
                />
                <span className="cal-person-head__text">
                  <span className="cal-person-head__name" title={column.person.name}>
                    {column.person.name}
                  </span>
                  <span className="type-meta">{column.person.meta}</span>
                </span>
              </div>
            ) : (
              <div className="cal-day-head" key={column.key}>
                <span className="cal-day-head__weekday type-meta">{column.title}</span>
                <span className={column.highlight ? 'cal-daynum is-today' : 'cal-daynum'}>
                  {column.subtitle}
                </span>
              </div>
            ),
          )}
        </div>

        <div className="cal-body">
          <div className="cal-gutter" style={{ height: px(model.end) }}>
            {model.hours.map((hour) =>
              /* Час, на который легла бы метка «сейчас», не рисуется: розовая
                 цифра вытесняет серую, а не ложится поверх неё наполовину. */
              showsToday && nowInRange && Math.abs(hour - now!.minutes) < 20 ? null : (
                <span
                  key={hour}
                  className="cal-gutter__hour type-dense tnum"
                  style={{ top: px(hour) }}
                >
                  {clock(hour)}
                </span>
              ),
            )}
            {/* Метка «сейчас» в колонке времени — розовая цифра антиквой:
                находится глазом первой (Design System V2 §6). */}
            {showsToday && nowInRange ? (
              <span
                className="cal-gutter__now type-now"
                style={{ top: px(now!.minutes) }}
                aria-hidden="true"
              >
                {clock(now!.minutes)}
              </span>
            ) : null}
          </div>

          {columns.map((column, columnIndex) => {
            const laid = model.byColumn.get(column.key);
            const work = laid?.work ?? [];
            const closed = work.length === 0;
            const holes = holesIn(work);
            const dayFrom = work[0]?.from ?? 0;
            const dayTo = work[work.length - 1]?.to ?? 0;
            const where = column.person?.name ?? `${column.title} ${column.subtitle}`.trim();
            const columnEntries = entries.filter((entry) => entry.columnKey === column.key);
            const placement = lanes(columnEntries);
            const columnPast = now !== null && column.dateKey < now.key;

            return (
              <div
                className="cal-col"
                key={column.key}
                ref={(node) => {
                  columnNodes.current[columnIndex] = node;
                }}
                style={{ height: px(model.end) }}
                onPointerDown={(event) => startSelect(event, columnIndex)}
              >
                {closed ? (
                  <div className="cal-off" style={{ top: 0, height: px(model.end) }}>
                    <span className="type-meta">{t.schedule.closed}</span>
                  </div>
                ) : (
                  <>
                    {dayFrom > model.start ? (
                      <div className="cal-off" style={{ top: 0, height: px(dayFrom) }} />
                    ) : null}
                    {dayTo < model.end ? (
                      <div
                        className="cal-off"
                        style={{ top: px(dayTo), height: px(model.end) - px(dayTo) }}
                      />
                    ) : null}
                    {holes.map((hole) => (
                      <div
                        className="cal-off cal-off--lunch"
                        key={hole.from}
                        style={{ top: px(hole.from), height: px(hole.to) - px(hole.from) }}
                      >
                        {hole.to - hole.from >= 40 ? (
                          <span className="type-meta">{t.schedule.lunch}</span>
                        ) : null}
                      </div>
                    ))}
                  </>
                )}

                {/* Полчаса, а не час: окно длится тридцать минут, и клетка,
                    которая предлагает его завести, обязана совпадать с ним —
                    иначе нажатие в 16:45 открывает черновик на 16:00. */}
                {model.hours.flatMap((hour) =>
                  [hour, hour + SLOT_MINUTES]
                    .filter((at) => at < model.end)
                    .map((at) => (
                      <button
                        type="button"
                        key={at}
                        className="cal-slot"
                        style={{ top: px(at), height: slotPx }}
                        aria-label={fmt(t.schedule.slotCreate, { day: where, time: clock(at) })}
                        onClick={(event) => {
                          if (consumeClick()) return;
                          onSelectEmpty(column, at, event.currentTarget.getBoundingClientRect());
                        }}
                      />
                    )),
                )}

                {/* Заблокированное время — над клетками «открыть время», под
                    окнами и визитами: визит, записанный до блока, обязан
                    остаться видимым и нажимаемым. */}
                {(laid?.blocks ?? []).map((span) => {
                  const top = px(Math.max(span.from, model.start));
                  const height = px(Math.min(span.to, model.end)) - top - 2;
                  if (height <= 0) return null;
                  const label = span.title ?? t.schedule.blockDefault;
                  return (
                    <button
                      type="button"
                      key={span.id}
                      className="cal-block"
                      style={{ top, height }}
                      aria-label={fmt(t.schedule.blockAria, {
                        from: clock(span.from),
                        to: clock(span.to),
                        title: label,
                      })}
                      onClick={() => {
                        if (consumeClick()) return;
                        onSelectBlock(span.id);
                      }}
                    >
                      <span className="cal-block__label type-dense">{label}</span>
                      {height >= 40 ? (
                        <span className="cal-block__time type-meta tnum">
                          {clock(span.from)}–{clock(span.to)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}

                {drag?.kind === 'select' && drag.columnIndex === columnIndex ? (
                  <div
                    className="cal-select type-dense tnum"
                    style={{
                      top: px(drag.range.from),
                      height: px(drag.range.to) - px(drag.range.from),
                    }}
                    aria-hidden="true"
                  >
                    {clock(drag.range.from)}–{clock(drag.range.to)}
                  </div>
                ) : null}

                {/* Свободные окна — розовые предметы поверх клеток «открыть
                    время» и под записями: порядок в DOM решает, кому
                    достанется нажатие. */}
                {(laid?.free ?? []).map((slot) => (
                  <FreeTime
                    key={slot.id}
                    variant="slot"
                    hidden={slot.hidden}
                    icon={slot.hidden ? <Icon name="eyeOff" className="ico-16" /> : undefined}
                    /* В одной колонке окно подписано словами; в неделе и в
                       командном дне — одним часом: «10:00 · Free win…» в узкой
                       колонке не дочитывался, а розовый предмет и так значит
                       «свободно». Скрытое окно и там несёт свой глаз. */
                    label={
                      columns.length === 1
                        ? `${clock(slot.at)} · ${slot.hidden ? t.schedule.hiddenBadge : t.schedule.freeSlot}`
                        : clock(slot.at)
                    }
                    /* Пилюля «Открыть» — только в одной колонке дня: в неделе
                       и в командном дне десятки пилюль делали акцент фоном. */
                    pill={columns.length === 1 ? t.home.open : undefined}
                    style={{ top: px(slot.at) + 1, height: slotPx - 2 }}
                    aria-label={fmt(slot.hidden ? t.schedule.slotHidden : t.schedule.slotEdit, {
                      time: clock(slot.at),
                    })}
                    onClick={() => {
                      if (consumeClick()) return;
                      onSelectSlot(slot.id);
                    }}
                  />
                ))}

                {columnEntries.map((entry) => {
                  const { lane, of } = placement.get(entry) ?? { lane: 0, of: 1 };
                  const width = `calc((100% - 16px) / ${of})`;
                  /* Высота честна длительности, но не ниже получаса: имя
                     режется по середине букв, а первыми уходят латышские
                     диакритики. */
                  const height = Math.max(
                    (MIN_BLOCK_MINUTES / 60) * hourPx - 2,
                    (entry.minutes / 60) * hourPx - 2,
                  );
                  const twoLines = height >= 44;
                  const threeLines = height >= 64;
                  /* Портрет — только в широкой колонке дня: в неделе он
                     отнимал у имени треть ширины, и «Anete Ozola» резалась
                     до «Anete O…». */
                  const withPortrait =
                    register === 'spacious' && height >= 56 && columns.length === 1;
                  const lifted = drag?.kind === 'move' && drag.entry.id === entry.id;
                  const movable = Boolean(interactions?.canMove(entry));
                  const past =
                    columnPast ||
                    (now !== null &&
                      now.key === column.dateKey &&
                      entry.at + entry.minutes <= now.minutes);
                  const selected = selectedBookingId === entry.id;
                  const classes = [
                    'cal-appt',
                    entry.pending ? 'is-pending' : '',
                    movable ? 'is-movable' : '',
                    lifted ? 'is-lifted' : '',
                    past && !selected ? 'is-past' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <button
                      type="button"
                      key={entry.id}
                      className={classes}
                      data-selected={selected ? 'true' : undefined}
                      style={
                        {
                          top: px(entry.at),
                          height,
                          left: `calc(8px + ${lane} * ${width})`,
                          width,
                          right: 'auto',
                          '--tone': entry.tone,
                        } as CSSProperties
                      }
                      title={`${clock(entry.at)}–${clock(entry.at + entry.minutes)} · ${entry.clientName} · ${entry.serviceName}`}
                      onPointerDown={(event) => startMove(event, entry, columnIndex)}
                      onClick={() => {
                        if (consumeClick()) return;
                        onSelectBooking(entry.booking);
                      }}
                    >
                      <ServiceBar tone={entry.tone} inset />
                      <span className="cal-appt__body">
                        {twoLines ? (
                          <span className="cal-appt__time type-dense tnum">
                            {clock(entry.at)}–{clock(entry.at + entry.minutes)}
                          </span>
                        ) : null}
                        <span className="cal-appt__name type-strong">
                          {/* Час перед именем — только в широкой колонке дня:
                              в неделе он отбирал у имени треть строки, а
                              положение блока и так называет час. */}
                          {!twoLines && columns.length === 1 ? (
                            <span className="cal-appt__time-inline tnum">{clock(entry.at)} </span>
                          ) : null}
                          {entry.clientName}
                        </span>
                        {threeLines ? (
                          <span className="cal-appt__meta type-meta">
                            {entry.serviceName} · {duration(entry.minutes)}
                            {entry.pending ? (
                              <>
                                {' · '}
                                <span className="cal-appt__pending">{t.bookings.filterNew}</span>
                              </>
                            ) : null}
                          </span>
                        ) : null}
                      </span>
                      {withPortrait ? (
                        <span className="portrait cal-appt__portrait" aria-hidden="true">
                          {initials(entry.clientName)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}

                {drag?.kind === 'move' && drag.columnIndex === columnIndex ? (
                  <div
                    className="cal-appt is-ghost"
                    style={
                      {
                        top: px(drag.at),
                        height: Math.max(
                          (MIN_BLOCK_MINUTES / 60) * hourPx - 2,
                          (drag.entry.minutes / 60) * hourPx - 2,
                        ),
                        '--tone': drag.entry.tone,
                      } as CSSProperties
                    }
                    aria-hidden="true"
                  >
                    <ServiceBar tone={drag.entry.tone} inset />
                    <span className="cal-appt__body">
                      <span className="cal-appt__time type-dense tnum">
                        {clock(drag.at)}–{clock(drag.at + drag.entry.minutes)}
                      </span>
                      <span className="cal-appt__name type-strong">{drag.entry.clientName}</span>
                    </span>
                  </div>
                ) : null}

                {now &&
                now.key === column.dateKey &&
                now.minutes > model.start &&
                now.minutes < model.end ? (
                  <div className="cal-now" style={{ top: px(now.minutes) }} aria-hidden="true" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { minutesOfDay, clock, serviceTone };
