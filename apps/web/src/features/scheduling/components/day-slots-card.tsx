'use client';

import { Lock } from '@phosphor-icons/react';

import { fmt, useLocale, useT } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { DaySlots, PublishedSlot } from '../types';

function formatTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

interface DaySlotsCardProps {
  day: DaySlots;
  onSelectSlot: (slot: PublishedSlot) => void;
}

export function DaySlotsCard({ day, onSelectSlot }: DaySlotsCardProps) {
  const t = useT();
  const locale = useLocale();
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
          const time = formatTime(slot.startsAt, locale);
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => onSelectSlot(slot)}
              aria-label={
                isBooked ? fmt(t.schedule.slotBooked, { time }) : fmt(t.schedule.slotEdit, { time })
              }
              /* `min-h` + `leading-none`: line-height alone left the digits
                 taller than the pill and they spilled past its edge. */
              className={cn(
                'press inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-semibold leading-none tabular-nums',
                isBooked
                  ? 'bg-success-soft text-success hover:brightness-95'
                  : 'bg-accent-soft text-accent hover:brightness-95',
              )}
            >
              {time}
              {isBooked ? <Lock size={13} weight="fill" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
