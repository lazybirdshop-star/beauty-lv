'use client';

import { EyeSlash, Lock } from '@phosphor-icons/react';

import { formatTime } from '@/lib/format';
import { useTimeZone } from '@/lib/timezone';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { DaySlots, PublishedSlot } from '../types';

interface DaySlotsCardProps {
  day: DaySlots;
  onSelectSlot: (slot: PublishedSlot) => void;
}

export function DaySlotsCard({ day, onSelectSlot }: DaySlotsCardProps) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  return (
    <Card>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-lg font-semibold text-ink">{day.dayNumber}</span>
        <span className="text-sm text-ink-soft">
          {day.monthShort}, {day.weekdayShort}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {day.slots.map((slot) => {
          const isBooked = slot.status === 'booked';
          const isHidden = !isBooked && Boolean(slot.hiddenAt);
          const time = formatTime(slot.startsAt, locale, timeZone);
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => onSelectSlot(slot)}
              aria-label={
                isBooked
                  ? fmt(t.schedule.slotBooked, { time })
                  : isHidden
                    ? fmt(t.schedule.slotHidden, { time })
                    : fmt(t.schedule.slotEdit, { time })
              }
              /* `min-h` + `leading-none`: line-height alone left the digits
                 taller than the pill and they spilled past its edge.
                 Same vocabulary as the week view — the two views used to
                 teach two different colour models of the same fact: free is
                 a neutral filled pill (the accent stays reserved for actions),
                 booked is a quiet outline with a lock, never success-green. */
              className={cn(
                'press inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-semibold leading-none tabular-nums',
                isBooked
                  ? 'border border-border bg-transparent text-ink-faint hover:border-border-strong'
                  : isHidden
                    ? /* Пунктир, а не сплошная обводка занятого: скрытое окно
                         не продано, оно просто снято с витрины — и разница
                         должна читаться, не полагаясь на один значок. */
                      'border border-dashed border-border-strong bg-transparent text-ink-faint hover:bg-bg-sunken/40'
                    : 'bg-bg-sunken text-ink hover:bg-bg-sunken/60',
              )}
            >
              {time}
              {isBooked ? <Lock size={13} weight="fill" aria-hidden="true" /> : null}
              {isHidden ? <EyeSlash size={13} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
