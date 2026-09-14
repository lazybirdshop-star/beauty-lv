'use client';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { getBookingStatusMeta } from '@/features/bookings/status-meta';
import { formatDuration } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

import type { CalendarEntry } from '../calendar-columns';
import { blockSpans, clock, minutesOfDay } from '../calendar-model';
import { isSlotOpen } from '../calendar-summary';
import type { PublishedSlot, TimeBlock } from '../types';

/**
 * Повестка дня на телефоне — прототип «Кабинет 2026», `.agenda-rows.big`.
 *
 * Строки под палец, 56 px: слева время и длительность, в середине имя, справа
 * статус, услуга второй строкой. Заблокированное время стоит в том же ряду по
 * часу — «Обед до 14:00», — иначе дыра между визитами читалась бы как
 * свободное время. Под строками — свободные окна дня чипами: нажатие
 * открывает карточку окна.
 *
 * Сетка суток остаётся вторым видом: там видна пропорция дня, здесь — список
 * дел.
 */
export function CalendarDayAgenda({
  dateKey,
  entries,
  blocks,
  slots,
  timeZone,
  onOpen,
  onBlock,
  onSlot,
}: {
  dateKey: string;
  /** Визиты этого дня того, чьё время смотрят. */
  entries: CalendarEntry[];
  /** Блоки того же человека — день режется здесь. */
  blocks: TimeBlock[];
  /** Окна этого дня того же человека. */
  slots: PublishedSlot[];
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

  const open = slots
    .filter((slot) => isSlotOpen(slot, entries, dateKey, timeZone))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

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
                  <small>{formatDuration(entry.minutes, units)}</small>
                </span>
                <span className="day-agenda__name">{entry.clientName}</span>
                <Badge tone={meta[status].tone} className="day-agenda__status">
                  {meta[status].label}
                </Badge>
                <span className="day-agenda__svc">{entry.serviceName}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState title={t.home.noBookings} />
      )}

      {open.length ? (
        <section className="day-agenda__free" aria-label={t.schedule.freeSlotsTitle}>
          <h3 className="day-agenda__free-title">
            {t.schedule.freeSlotsTitle}{' '}
            <span className="day-agenda__count tnum">{open.length}</span>
          </h3>
          <div className="day-agenda__chips">
            {open.map((slot) => (
              <button
                type="button"
                key={slot.id}
                className="day-agenda__chip tnum"
                onClick={() => onSlot(slot.id)}
              >
                {clock(minutesOfDay(slot.startsAt, timeZone))}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
