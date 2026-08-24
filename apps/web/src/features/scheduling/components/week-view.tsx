'use client';

import { CaretLeft, CaretRight, Lock } from '@phosphor-icons/react';

import { formatTime } from '@/lib/format';
import { useTimeZone } from '@/lib/timezone';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { PublishedSlot } from '../types';
import type { WeekDay } from '../week';

interface WeekViewProps {
  days: WeekDay[];
  rangeLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  /** Free window → edit it; booked one → see who is coming. */
  onSelectSlot: (slot: PublishedSlot) => void;
}

const NAV_CLASS =
  'press flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-bg-sunken/70 text-ink hover:bg-bg-sunken';

export function WeekView({
  days,
  rangeLabel,
  onPrevWeek,
  onNextWeek,
  onToday,
  onSelectSlot,
}: WeekViewProps) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const weekTotal = days.reduce((sum, day) => sum + day.slots.length, 0);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[22px] leading-none text-ink">{t.schedule.week}</h2>
          <p className="mt-1 truncate text-sm text-ink-soft">{rangeLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onPrevWeek}
            className={NAV_CLASS}
            aria-label={t.schedule.prevWeek}
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="press inline-flex min-h-11 cursor-pointer items-center rounded-full bg-bg-sunken/70 px-3.5 text-sm font-semibold text-ink hover:bg-bg-sunken"
          >
            {t.schedule.today}
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            className={NAV_CLASS}
            aria-label={t.schedule.nextWeek}
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* At-a-glance strip: a real 7×12 time grid would be unreadable at 375px,
          so the week reads as seven columns of counts instead. Past days go
          quiet through the faint ink, not opacity — translucent text drops
          below contrast floors and reads as broken, not as done (КЛ-5). */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div
            key={day.dateKey}
            className={cn(
              'flex flex-col items-center gap-1 rounded-2xl py-2',
              day.isToday && 'bg-accent-soft',
            )}
          >
            <span
              className={cn(
                'text-[11px] font-semibold uppercase tracking-[0.04em]',
                day.isPast && !day.isToday ? 'text-ink-faint' : 'text-ink-soft',
              )}
            >
              {day.weekdayShort}
            </span>
            <span
              className={cn(
                'text-[15px] font-semibold tabular-nums',
                day.isToday ? 'text-ink' : day.isPast ? 'text-ink-faint' : 'text-ink',
              )}
            >
              {day.dayNumber}
            </span>
            {/* Accent dot = something is still open; neutral dot = the day is
                full. Green belongs to «подтверждена», not to «занято» — in
                every calendar convention green reads as free (КЛ-4). */}
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                day.availableCount > 0
                  ? 'bg-accent'
                  : day.bookedCount > 0
                    ? 'bg-border-strong'
                    : 'bg-transparent',
              )}
              aria-hidden="true"
            />
            {/* The dot is colour-and-size only — the numbers behind it are
                spoken here (Sam heard nothing at all before). */}
            <span className="sr-only">
              {fmt(t.schedule.dayCounts, {
                available: day.availableCount,
                booked: day.bookedCount,
              })}
            </span>
          </div>
        ))}
      </div>

      {weekTotal === 0 ? (
        <p className="rounded-2xl bg-bg-sunken/70 px-4 py-8 text-center text-sm text-ink-soft">
          {t.schedule.emptyWeek}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {days
            .filter((day) => day.slots.length > 0)
            .map((day) => (
              <div key={day.dateKey}>
                <p
                  className={cn(
                    'mb-1.5 text-[13px] font-semibold',
                    day.isPast ? 'text-ink-faint' : 'text-ink-soft',
                  )}
                >
                  {day.weekdayShort}, {day.dayNumber}
                  {day.bookedCount > 0
                    ? ` · ${fmt(t.schedule.bookedCount, { count: day.bookedCount })}`
                    : ''}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {day.slots.map((slot) => {
                    const isBooked = slot.status === 'booked';
                    const time = formatTime(slot.startsAt, locale, timeZone);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => onSelectSlot(slot)}
                        aria-label={
                          isBooked
                            ? fmt(t.schedule.slotBooked, { time })
                            : fmt(t.schedule.slotEdit, { time })
                        }
                        /* `min-h` + `leading-none` on purpose: relying on
                           line-height alone left the digits taller than the
                           pill and they spilled past its edge.
                           A booked window is a quiet outlined pill with a
                           lock, not success-green: the same fact reads as a
                           struck-through grey on the client's page, and green
                           taught the opposite model (КЛ-4). */
                        className={cn(
                          'press inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-semibold leading-none tabular-nums',
                          isBooked
                            ? 'border border-border bg-transparent text-ink-faint hover:border-border-strong'
                            : 'bg-bg-sunken text-ink hover:bg-bg-sunken/60',
                        )}
                      >
                        {time}
                        {isBooked ? <Lock size={13} weight="fill" aria-hidden="true" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </Card>
  );
}
