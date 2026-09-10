'use client';

/**
 * Сетка календаря — по артборду `Calendar.dc.html`.
 *
 * Шкала часов слева и N колонок справа; час равен 50 пикселям, записи стоят на
 * своих местах и своей высоты. Время вне рабочих часов утоплено тоном: мастер
 * обязана видеть не только когда она занята, но и когда её вообще нет, —
 * иначе пустая клетка в восемь утра читается как свободное окно.
 *
 * **Колонка — не обязательно день.** Тот же экран показывает неделю по дням и
 * день по мастерам (спецификация §12, SALON.md §8.5); устройство сетки при этом
 * одно, и второй её экземпляр разошёлся бы с первым в первую же правку. Что в
 * колонке, решает `GridColumn`, где что стоит — `buildCalendarModel`.
 *
 * **Сетка — своя прокручиваемая поверхность.** Шапка с именами прилипает к
 * верху, шкала часов — к левому краю: у салона на пятнадцать мастеров сетка
 * шире экрана, и администратор, пролиставшая к 18:00 и вправо к Софии, обязана
 * по-прежнему видеть, чья это колонка и который час. Пока прокручивалась
 * страница, прилипать было не к чему.
 *
 * Что откуда берётся:
 * — рабочее время — из опубликованных окон: первое и последнее окно и есть
 *   границы дня, за них клиент записаться не может;
 * — «Перерыв» — дыра внутри рабочего дня, в которой нет ни окна, ни записи;
 * — «Выходной» — колонка, в которой не открыто ни одного окна.
 *
 * Свободные окна рисуются наравне с записями: пустое место календаря не значит
 * «сюда можно записаться» (спецификация §11). Окно — предмет, по нему
 * открывается его карточка, а «открыть время» осталось за пустым местом.
 */
import type { CSSProperties } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { Booking } from '@/features/bookings/types';
import { serviceTone } from '@/features/dashboard-home/service-tone';
import { avatarTint } from '@/lib/avatar';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { CalendarEntry, GridColumn } from '../calendar-columns';
import {
  HOUR,
  SLOT_MINUTES,
  buildCalendarModel,
  clock,
  holesIn,
  lanes,
  minutesOfDay,
} from '../calendar-model';

export type { CalendarEntry, GridColumn };

export function CalendarGrid({
  columns,
  entries,
  timeZone,
  variant = 'days',
  onSelectBooking,
  onSelectSlot,
  onSelectEmpty,
}: {
  columns: GridColumn[];
  entries: CalendarEntry[];
  timeZone: string;
  /** `team` — колонка человек: у неё всегда есть шапка с именем, даже если колонка одна. */
  variant?: 'days' | 'team';
  onSelectBooking: (booking: Booking) => void;
  /** Нажатие по свободному окну — его карточка: перенести, скрыть, удалить. */
  onSelectSlot: (slotId: string) => void;
  /** Нажатие по пустому месту — действие на это время в этой колонке. */
  onSelectEmpty: (column: GridColumn, minutes: number) => void;
}) {
  const t = useT();
  const scroller = useRef<HTMLDivElement>(null);

  /* Черта «сейчас» тикает раз в минуту — секундная точность на шкале, где час
     равен пятидесяти пикселям, не значит ничего. */
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

  const px = (minutes: number) => ((minutes - model.start) / 60) * HOUR;

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
    node.scrollTop = Math.max(0, ((target - model.start) / 60) * HOUR - 8);
  }, [shownKey, now, columns, firstWork, model.start]);

  const cardClass =
    variant === 'team'
      ? 'cal-card cal-card--team'
      : columns.length === 1
        ? 'cal-card cal-card--day'
        : 'cal-card';

  return (
    /* Число колонок уезжает в CSS переменной: у «дня», «недели» и «команды»
       одна и та же сетка, и повторять её устройство в разметке — верный способ
       однажды показать семь колонок для одного дня. */
    <div className={cardClass} style={{ '--cal-days': columns.length } as CSSProperties}>
      <div className="cal-scroll" ref={scroller}>
        <div className="cal-head">
          <span className="cal-gutter-head" />
          {columns.map((column) =>
            column.person ? (
              <div className="cal-day-head cal-person-head" key={column.key}>
                <span
                  className="avatar cal-person-head__avatar"
                  style={avatarTint(column.key)}
                  aria-hidden="true"
                >
                  {column.person.initials}
                </span>
                <span className="cal-person-head__text">
                  <span className="cal-person-head__name" title={column.person.name}>
                    {column.person.name}
                  </span>
                  <span className="t-meta">{column.person.meta}</span>
                </span>
              </div>
            ) : (
              <div className="cal-day-head" key={column.key}>
                <span className="t-label">{column.title}</span>
                <span className={column.highlight ? 'cal-daynum is-today' : 'cal-daynum'}>
                  {column.subtitle}
                </span>
              </div>
            ),
          )}
        </div>

        <div className="cal-body">
          <div className="cal-gutter" style={{ height: px(model.end) }}>
            {model.hours.map((hour) => (
              <span key={hour} className="tnum" style={{ top: px(hour) }}>
                {clock(hour)}
              </span>
            ))}
          </div>

          {columns.map((column) => {
            const laid = model.byColumn.get(column.key);
            const work = laid?.work ?? [];
            const closed = work.length === 0;
            const holes = holesIn(work);
            const dayFrom = work[0]?.from ?? 0;
            const dayTo = work[work.length - 1]?.to ?? 0;
            const where = column.person?.name ?? `${column.title} ${column.subtitle}`.trim();
            const columnEntries = entries.filter((entry) => entry.columnKey === column.key);
            const placement = lanes(columnEntries);

            return (
              <div className="cal-col" key={column.key} style={{ height: px(model.end) }}>
                {closed ? (
                  <div className="cal-off" style={{ top: 0, height: px(model.end) }}>
                    <span className="t-meta">{t.schedule.closed}</span>
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
                          <span className="t-meta">{t.schedule.lunch}</span>
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
                        style={{ top: px(at), height: (SLOT_MINUTES / 60) * HOUR }}
                        aria-label={fmt(t.schedule.slotCreate, { day: where, time: clock(at) })}
                        onClick={() => onSelectEmpty(column, at)}
                      />
                    )),
                )}

                {/* Свободные окна — поверх клеток «открыть время» и под
                    записями: порядок в DOM и решает, кому достанется нажатие. */}
                {(laid?.free ?? []).map((slot) => (
                  <button
                    type="button"
                    key={slot.id}
                    className={slot.hidden ? 'cal-free is-hidden' : 'cal-free'}
                    style={{ top: px(slot.at), height: (SLOT_MINUTES / 60) * HOUR - 2 }}
                    aria-label={fmt(slot.hidden ? t.schedule.slotHidden : t.schedule.slotEdit, {
                      time: clock(slot.at),
                    })}
                    onClick={() => onSelectSlot(slot.id)}
                  >
                    <span className="cal-free__time tnum">{clock(slot.at)}</span>
                    <span className="cal-free__label">
                      {slot.hidden ? t.schedule.hiddenBadge : t.schedule.freeSlot}
                    </span>
                  </button>
                ))}

                {columnEntries.map((entry) => {
                  const { lane, of } = placement.get(entry) ?? { lane: 0, of: 1 };
                  const width = `calc((100% - 6px) / ${of})`;
                  /* Тридцать, а не двадцать: паддинг и рамка съедают 12px, и на
                     строку в 12,5px оставалось восемь — имя резалось по середине
                     букв, а первыми уходили латышские диакритики. */
                  const height = Math.max(30, (entry.minutes / 60) * HOUR - 2);
                  /* Порог — под две строки: обвязка съедает 12, и на две строки
                     по 17 нужно 46. */
                  const roomy = height >= 46;
                  return (
                    <button
                      type="button"
                      key={entry.id}
                      className={entry.pending ? 'cal-appt is-pending' : 'cal-appt'}
                      style={
                        {
                          top: px(entry.at),
                          height,
                          left: `calc(3px + ${lane} * ${width})`,
                          width,
                          right: 'auto',
                          '--tone': entry.tone,
                        } as CSSProperties
                      }
                      onClick={() => onSelectBooking(entry.booking)}
                    >
                      <span
                        className="cal-appt__name"
                        title={`${clock(entry.at)} · ${entry.clientName} · ${entry.serviceName}`}
                      >
                        {/* Цвет услуги — точкой: различать он умеет и в семи
                            пикселях, а заливкой красил полнедели. */}
                        <span className="cal-appt__tone" aria-hidden="true" />
                        <span className="cal-appt__label">{entry.clientName}</span>
                        {entry.pending ? <span className="cal-appt__dot" /> : null}
                      </span>
                      {roomy ? (
                        <span className="cal-appt__meta">
                          {clock(entry.at)} · {entry.serviceName}
                        </span>
                      ) : null}
                    </button>
                  );
                })}

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
