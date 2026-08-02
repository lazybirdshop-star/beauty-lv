'use client';

import { Lock } from '@phosphor-icons/react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { DaySlots, PublishedSlot } from '../types';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

interface DaySlotsCardProps {
  day: DaySlots;
  onSelectSlot: (slot: PublishedSlot) => void;
}

export function DaySlotsCard({ day, onSelectSlot }: DaySlotsCardProps) {
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
          const time = formatTime(slot.startsAt);
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => onSelectSlot(slot)}
              aria-label={isBooked ? `${time} — занято, открыть запись` : `${time} — изменить окно`}
              /* `min-h` + `leading-none`: line-height alone left the digits
                 taller than the pill and they spilled past its edge. */
              className={cn(
                'press inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold leading-none tabular-nums',
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
