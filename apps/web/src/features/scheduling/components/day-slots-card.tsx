'use client';

import { Lock, X } from '@phosphor-icons/react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { DaySlots } from '../types';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

interface DaySlotsCardProps {
  day: DaySlots;
  onDeleteSlot: (slotId: string) => void;
  deletingSlotId: string | null;
}

export function DaySlotsCard({ day, onDeleteSlot, deletingSlotId }: DaySlotsCardProps) {
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
          return (
            <span
              key={slot.id}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold',
                isBooked ? 'bg-bg-sunken text-ink-faint' : 'bg-accent-soft text-accent',
              )}
            >
              {formatTime(slot.startsAt)}
              {isBooked ? (
                <Lock size={13} />
              ) : (
                <button
                  type="button"
                  onClick={() => onDeleteSlot(slot.id)}
                  disabled={deletingSlotId === slot.id}
                  aria-label="Удалить окно"
                  className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent/20"
                >
                  <X size={11} weight="bold" />
                </button>
              )}
            </span>
          );
        })}
      </div>
    </Card>
  );
}
