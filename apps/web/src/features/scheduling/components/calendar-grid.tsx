'use client';

/**
 * Сетка недели — по артборду `Calendar.dc.html`.
 *
 * Семь колонок, час равен 50 пикселям, записи стоят на своих местах и своей
 * высоты. Всё, что вне рабочих часов, заштриховано: мастер обязана видеть не
 * только когда она занята, но и когда её вообще нет, — иначе пустая клетка в
 * восемь утра читается как свободное окно.
 *
 * Что откуда берётся:
 * — рабочее время дня — из опубликованных окон: первое и последнее окно суток
 *   и есть границы дня, за них клиент записаться не может;
 * — «Обед» — дыра внутри рабочего дня, в которой нет ни окна, ни записи;
 * — «Выходной» — сутки, в которых мастер не открыла ни одного окна.
 *
 * Своей таблицы рабочих часов у продукта нет, и заводить её ради подписи не
 * за чем: расписание и есть то, что мастер объявила рабочим временем.
 *
 * Свободные окна рисуются наравне с записями, и это не украшение. Раньше окна
 * участвовали только в расчёте границ дня: открытое время выглядело ровно так
 * же, как время, которого мастер не открывала, — белая клетка. Отличить
 * «сюда клиент может встать» от «сюда нельзя» было нечем, а нажатие на любую
 * белую клетку предлагало опубликовать окно, в том числе там, где оно уже
 * опубликовано. Теперь окно — предмет: его видно, по нему открывается его
 * карточка (перенести, скрыть, удалить), а «опубликовать» осталось за пустым
 * местом, где окна действительно нет.
 */
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';

import type { Booking } from '@/features/bookings/types';
import { serviceTone } from '@/features/dashboard-home/service-tone';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import type { PublishedSlot } from '../types';
import type { WeekDay } from '../week';

/** Высота часа в сетке недели — 50px по артборду. */
const HOUR = 50;
/** День всегда показывает хотя бы это окно, даже если работы в нём нет. */
const DEFAULT_FROM = 8 * 60;
const DEFAULT_TO = 19 * 60;
/** Длительность окна без записи — столько же, сколько шаг сетки в макете. */
const SLOT_MINUTES = 30;

export interface CalendarEntry {
  id: string;
  booking: Booking;
  /** Минуты от полуночи в поясе заведения. */
  at: number;
  minutes: number;
  dateKey: string;
  clientName: string;
  serviceName: string;
  tone: string;
  /** Запись, которую мастер ещё не подтвердила: пунктир и янтарная точка. */
  pending: boolean;
}

function minutesOfDay(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  return (
    Number(parts.find((p) => p.type === 'hour')?.value ?? '0') * 60 +
    Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  );
}

function clock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Пересекающиеся записи — по дорожкам.
 *
 * У салона в одном дне работают несколько мастеров, и две записи на 15:00 —
 * норма, а не ошибка данных. Наложенные друг на друга карточки прячут одну из
 * них целиком, поэтому пересекающиеся делят ширину колонки поровну.
 *
 * Жадно и по левому краю: интервалы уже отсортированы по началу, и запись
 * встаёт в первую дорожку, которая к её началу освободилась.
 */
function lanes<T extends { at: number; minutes: number }>(
  items: T[],
): Map<T, { lane: number; of: number }> {
  const sorted = [...items].sort((a, b) => a.at - b.at || b.minutes - a.minutes);
  const placed = new Map<T, { lane: number; of: number }>();
  /* Группа — цепочка записей, связанных пересечениями: ширину они делят на
     всех, иначе соседние группы дня получили бы разную ширину карточек. */
  let group: T[] = [];
  let groupEnd = -1;
  const flush = () => {
    if (!group.length) return;
    const ends: number[] = [];
    const laneOf = new Map<T, number>();
    for (const item of group) {
      let lane = ends.findIndex((end) => end <= item.at);
      if (lane === -1) {
        lane = ends.length;
        ends.push(0);
      }
      ends[lane] = item.at + item.minutes;
      laneOf.set(item, lane);
    }
    for (const item of group) placed.set(item, { lane: laneOf.get(item) ?? 0, of: ends.length });
    group = [];
    groupEnd = -1;
  };

  for (const item of sorted) {
    if (group.length && item.at >= groupEnd) flush();
    group.push(item);
    groupEnd = Math.max(groupEnd, item.at + item.minutes);
  }
  flush();

  return placed;
}

/** Опубликованное и никем не занятое окно — предмет на сетке. */
interface FreeSlot {
  id: string;
  /** Минуты от полуночи в поясе заведения. */
  at: number;
  /** Окно есть у мастера, но клиенту его не предлагают. */
  hidden: boolean;
}

/** Слитые в один отрезки: рабочее время дня и дыры внутри него. */
function mergeSpans(spans: { from: number; to: number }[]): { from: number; to: number }[] {
  const sorted = [...spans].sort((a, b) => a.from - b.from);
  const out: { from: number; to: number }[] = [];
  for (const span of sorted) {
    const last = out[out.length - 1];
    if (last && span.from <= last.to) last.to = Math.max(last.to, span.to);
    else out.push({ ...span });
  }
  return out;
}

export function CalendarGrid({
  days,
  entries,
  timeZone,
  onSelectBooking,
  onSelectSlot,
  onSelectEmpty,
}: {
  days: WeekDay[];
  entries: CalendarEntry[];
  timeZone: string;
  onSelectBooking: (booking: Booking) => void;
  /** Нажатие по свободному окну — его карточка: перенести, скрыть, удалить. */
  onSelectSlot: (slotId: string) => void;
  /** Нажатие по пустому месту — опубликовать окно на это время. */
  onSelectEmpty: (dateKey: string, minutes: number) => void;
}) {
  const t = useT();

  /* Черта «сейчас» тикает раз в минуту — секундная точность на шкале, где
     час равен пятидесяти пикселям, не значит ничего. */
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

  const model = useMemo(() => {
    const byDay = new Map<
      string,
      {
        work: { from: number; to: number }[];
        busy: { from: number; to: number }[];
        free: FreeSlot[];
      }
    >();

    for (const day of days) {
      const open = day.slots
        .filter((slot: PublishedSlot) => !slot.hiddenAt)
        .map((slot: PublishedSlot) => {
          const at = minutesOfDay(slot.startsAt, timeZone);
          return { from: at, to: at + SLOT_MINUTES };
        });

      const booked = entries
        .filter((entry) => entry.dateKey === day.dateKey)
        .map((entry) => ({ from: entry.at, to: entry.at + entry.minutes }));

      /*
       * Окно, через которое идёт визит, предметом не рисуется: длинная услуга
       * занимает несколько окон подряд, и все они остались бы полосками
       * под карточкой записи. Занятое время уже названо самой записью.
       */
      const free = day.slots
        .filter((slot: PublishedSlot) => slot.status === 'available')
        .map((slot: PublishedSlot) => ({
          id: slot.id,
          at: minutesOfDay(slot.startsAt, timeZone),
          hidden: Boolean(slot.hiddenAt),
        }))
        .filter((slot) => !booked.some((span) => slot.at >= span.from && slot.at < span.to))
        .sort((a, b) => a.at - b.at);

      byDay.set(day.dateKey, {
        work: mergeSpans([...open, ...booked]),
        busy: mergeSpans(booked),
        free,
      });
    }

    const bounds = [...byDay.values()].flatMap(({ work }) => work);
    const from = bounds.length
      ? Math.min(DEFAULT_FROM, ...bounds.map((s) => s.from))
      : DEFAULT_FROM;
    const to = bounds.length ? Math.max(DEFAULT_TO, ...bounds.map((s) => s.to)) : DEFAULT_TO;

    const start = Math.floor(from / 60) * 60;
    const end = Math.ceil(to / 60) * 60;

    return {
      start,
      end,
      byDay,
      hours: Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60),
    };
  }, [days, entries, timeZone]);

  const px = (minutes: number) => ((minutes - model.start) / 60) * HOUR;

  return (
    /* Число колонок уезжает в CSS переменной: у «дня» и «недели» одна и та же
       сетка, и повторять её устройство в двух местах — верный способ однажды
       показать семь колонок для одного дня. */
    <div
      className={days.length === 1 ? 'card cal-card cal-card--day' : 'card cal-card'}
      style={{ '--cal-days': days.length } as CSSProperties}
    >
      <div className="cal-head">
        <span className="cal-gutter-head" />
        {days.map((day) => (
          <div className="cal-day-head" key={day.dateKey}>
            <span className="t-label">{day.weekdayShort}</span>
            <span className={day.isToday ? 'cal-daynum is-today' : 'cal-daynum'}>
              {day.dayNumber}
            </span>
          </div>
        ))}
      </div>

      <div className="cal-body">
        <div className="cal-gutter" style={{ height: px(model.end) }}>
          {model.hours.map((hour) => (
            <span key={hour} className="tnum" style={{ top: px(hour) }}>
              {clock(hour)}
            </span>
          ))}
        </div>

        {days.map((day) => {
          const day_ = model.byDay.get(day.dateKey);
          const work = day_?.work ?? [];
          const closed = work.length === 0;
          /* Дыры внутри рабочего дня — то, что в макете подписано «Обед». */
          const holes: { from: number; to: number }[] = [];
          for (let i = 0; i < work.length - 1; i += 1) {
            holes.push({ from: work[i]!.to, to: work[i + 1]!.from });
          }
          const dayFrom = work[0]?.from ?? 0;
          const dayTo = work[work.length - 1]?.to ?? 0;

          return (
            <div className="cal-col" key={day.dateKey} style={{ height: px(model.end) }}>
              {/* Нерабочее время — сплошная штриховка от края до начала дня и
                  от конца дня до края. */}
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
                      aria-label={fmt(t.schedule.slotCreate, {
                        day: `${day.weekdayShort} ${day.dayNumber}`,
                        time: clock(at),
                      })}
                      onClick={() => onSelectEmpty(day.dateKey, at)}
                    />
                  )),
              )}

              {/* Свободные окна — поверх клеток «завести окно» и под записями:
                  порядок в DOM и решает, кому достанется нажатие. */}
              {(day_?.free ?? []).map((slot) => (
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

              {(() => {
                const dayEntries = entries.filter((entry) => entry.dateKey === day.dateKey);
                const placement = lanes(dayEntries);
                return dayEntries.map((entry) => {
                  const { lane, of } = placement.get(entry) ?? { lane: 0, of: 1 };
                  const width = `calc((100% - 6px) / ${of})`;
                  /* Тридцать, а не двадцать: паддинг и рамка съедают 12px,
                     и на строку в 12,5px оставалось восемь — имя резалось по
                     середине букв, а первыми уходили латышские диакритики. */
                  const height = Math.max(30, (entry.minutes / 60) * HOUR - 2);
                  /* Короткой карточке достаётся только имя: вторая строка в
                     двадцать пикселей высоты обрезается на половине буквы, и
                     обрезанная подпись читается как поломка, а не как
                     «здесь не поместилось». */
                  /*
                   * Порог — под две строки, а не под одну.
                   *
                   * Тридцать четыре пикселя вмещали строку имени и обрезали
                   * вторую по середине букв: обвязка съедает 12, и на две
                   * строки по 17 нужно 46. Сорокапятиминутный визит получал 35
                   * и рисовал в них обе.
                   */
                  const roomy = height >= 46;
                  return (
                    <button
                      type="button"
                      key={entry.id}
                      className={entry.pending ? 'cal-appt is-pending' : 'cal-appt'}
                      style={{
                        top: px(entry.at),
                        height,
                        left: `calc(3px + ${lane} * ${width})`,
                        width,
                        right: 'auto',
                        // @ts-expect-error — токен тона услуги передаётся свойством
                        '--tone': entry.tone,
                      }}
                      onClick={() => onSelectBooking(entry.booking)}
                    >
                      <span
                        className="cal-appt__name"
                        title={`${clock(entry.at)} · ${entry.clientName} · ${entry.serviceName}`}
                      >
                        {/* Имя — в своей строке-обёртке: `text-overflow` не
                            работает на флекс-контейнере, и в узкой колонке
                            недели «Liene Straume» обрывалось на границе без
                            многоточия, как будто так и написано. */}
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
                });
              })()}

              {now &&
              now.key === day.dateKey &&
              now.minutes > model.start &&
              now.minutes < model.end ? (
                <div className="cal-now" style={{ top: px(now.minutes) }} aria-hidden="true" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { minutesOfDay, clock, serviceTone };
