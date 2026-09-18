'use client';

import type { CSSProperties } from 'react';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { getBookingStatusMeta } from '@/features/bookings/status-meta';
import { formatDuration, formatDurationShort } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

import type { CalendarEntry } from '../calendar-columns';
import { blockSpans, clock, minutesOfDay } from '../calendar-model';
import { isSlotOpen } from '../calendar-summary';
import { openIntervals } from '../open-intervals';
import type { PublishedSlot, TimeBlock } from '../types';

/**
 * Повестка дня на телефоне — прототип «Кабинет 2026», `.agenda-rows.big`.
 *
 * Строки под палец, 56 px: слева время и длительность, в середине имя, справа
 * статус, услуга второй строкой. У «Команды» перед именем — точка тона
 * мастера: в общей повестке важно, чья это запись. Заблокированное время
 * стоит в том же ряду по часу — «Обед до 14:00», — иначе дыра между визитами
 * читалась бы как свободное время. Под строками — свободное время отрезками
 * «16:00–17:00», как в прототипе: нажатие открывает карточку первого окна
 * отрезка.
 *
 * Сетка суток — вид большого экрана: там видна пропорция дня, здесь — список
 * дел.
 */
export function CalendarDayAgenda({
  dateKey,
  entries,
  blocks,
  slots,
  showMember = false,
  nameOf,
  timeZone,
  onOpen,
  onBlock,
  onSlot,
}: {
  dateKey: string;
  /** Визиты этого дня тех, чьё время смотрят. */
  entries: CalendarEntry[];
  /** Блоки тех же людей — день режется здесь. */
  blocks: TimeBlock[];
  /** Окна этого дня тех же людей. */
  slots: PublishedSlot[];
  /** Общая повестка команды — точка тона мастера перед именем. */
  showMember?: boolean;
  /** Имя мастера для строки: цвет — второй канал, а не единственный. */
  nameOf?: (memberId: string) => string | undefined;
  timeZone: string;
  onOpen: (bookingId: string) => void;
  onBlock: (blockId: string) => void;
  onSlot: (slotId: string) => void;
}) {
  const t = useT();
  const meta = getBookingStatusMeta(t);
  const units = { hoursShort: t.common.hoursShort, minutesShort: t.common.minutesShort };

  const rows = [
    ...entries.map((entry) => ({ kind: 'visit' as const, at: entry.at, entry })),
    ...blockSpans(blocks, dateKey, timeZone).map((span) => ({
      kind: 'block' as const,
      at: span.from,
      span,
    })),
  ].sort((a, b) => a.at - b.at);

  /* Свободное время отрезками: окна подряд одного человека — одна пилюля. */
  const open = slots.filter((slot) => isSlotOpen(slot, entries, dateKey, timeZone));
  const free = openIntervals(
    open,
    entries.map((entry) => entry.booking),
  ).map((interval) => ({
    interval,
    slot: open.find(
      (slot) =>
        slot.organizationMemberId === interval.memberId && slot.startsAt === interval.startsAt,
    ),
  }));

  return (
    <div className="card day-agenda">
      {rows.length ? (
        <div className="day-agenda__rows">
          {rows.map((row) => {
            if (row.kind === 'block') {
              return (
                <button
                  type="button"
                  key={row.span.id}
                  className="day-agenda__row is-block"
                  onClick={() => onBlock(row.span.id)}
                >
                  <span className="day-agenda__time tnum">{clock(row.span.from)}</span>
                  <span className="day-agenda__name">
                    {row.span.title ?? t.schedule.blockDefault}
                  </span>
                  <span className="day-agenda__svc tnum">
                    {fmt(t.workspace.untilTime, { time: clock(row.span.to) })}
                  </span>
                </button>
              );
            }
            const { entry } = row;
            const status = entry.booking.status;
            /* Кто принимает — словом, а не одним цветом: в общей повестке
               точка тона отвечала на вопрос «чей визит» в одиночку, и для
               восьми процентов мужчин две охры неразличимы. */
            const member = showMember ? nameOf?.(entry.memberId)?.split(' ')[0] : undefined;
            return (
              <button
                type="button"
                key={entry.id}
                className={cn(
                  'day-agenda__row',
                  status === 'completed' && 'is-done',
                  status === 'no_show' && 'is-noshow',
                )}
                onClick={() => onOpen(entry.id)}
              >
                <span className="day-agenda__time tnum">
                  {clock(entry.at)}
                  <small>{formatDurationShort(entry.minutes, units)}</small>
                </span>
                <span className="day-agenda__name">
                  {showMember ? (
                    <i
                      className="day-agenda__dot"
                      style={{ '--member': `var(--tone-${entry.memberTone})` } as CSSProperties}
                      aria-hidden="true"
                    />
                  ) : null}
                  {entry.clientName}
                </span>
                {/* Подтверждённая — состояние по умолчанию и бейджа не носит,
                    как в `VisitRow`: зелёная плашка в каждой строке топила
                    единственное «Ждёт ответа», ради которого список читают. */}
                {status === 'confirmed' ? null : (
                  <Badge tone={meta[status].tone} className="day-agenda__status">
                    {meta[status].label}
                  </Badge>
                )}
                <span className="day-agenda__svc">
                  {entry.serviceName}
                  {member ? ` · ${member}` : ''}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState title={t.home.noBookings} />
      )}

      {free.length ? (
        <section className="day-agenda__free" aria-label={t.schedule.freeTimeTitle}>
          {/* `h2`, а не `h3`: на телефоне выше стоит только заголовок
              страницы, и читалка объявляла пропуск уровня. */}
          {/* Итог — длительностью, а не числом. Число окон («30») стояло над
              десятью пилюлями, склеенными из тех же окон, и читалось как
              «показали не всё». Сумма отрезков совпадает с тем, что под ней
              нарисовано, и не спорит с плиткой «Свободных окон» над сеткой:
              там окна, здесь часы. */}
          <h2 className="day-agenda__free-title">
            {t.schedule.freeTimeTitle}{' '}
            <span className="day-agenda__count tnum">
              {formatDuration(
                free.reduce(
                  (sum, { interval }) =>
                    sum +
                    (new Date(interval.endsAt).getTime() - new Date(interval.startsAt).getTime()) /
                      60_000,
                  0,
                ),
                units,
              )}
            </span>
          </h2>
          <div className="day-agenda__chips">
            {free.map(({ interval, slot }) => (
              <button
                type="button"
                key={`${interval.memberId}-${interval.startsAt}`}
                className="day-agenda__chip tnum"
                disabled={!slot}
                onClick={() => slot && onSlot(slot.id)}
              >
                {clock(minutesOfDay(interval.startsAt, timeZone))}–
                {clock(minutesOfDay(interval.endsAt, timeZone))}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
