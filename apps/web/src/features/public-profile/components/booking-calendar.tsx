'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { BookingSheet } from './booking-sheet';
import { groupSlotsByDay } from '../group-by-day';
import type { PublicOrganization, PublishedSlot, SlotStatus } from '../types';

interface BookingCalendarProps {
  org: PublicOrganization;
  initialSlots: PublishedSlot[];
}

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' });

/**
 * The page's hero and primary conversion path: date → published slot →
 * guest details → confirm. There is no working-hours template and no slot
 * generation here on purpose — the master publishes exact windows one at a
 * time, the client only ever sees what she published (PRD.md §7.4).
 * `POST public-bookings` is real; the local `overrides` map is just
 * optimistic UI so the grid reflects "booked" instantly without a refetch.
 */
export function BookingCalendar({ org, initialSlots }: BookingCalendarProps) {
  const [overrides, setOverrides] = useState<Record<string, SlotStatus>>({});
  const [selectedDate, setSelectedDate] = useState<string | undefined>(initialSlots[0]?.date);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const days = useMemo(() => {
    const withOverrides = initialSlots.map((slot) => ({
      ...slot,
      status: overrides[slot.id] ?? slot.status,
    }));
    return groupSlotsByDay(withOverrides);
  }, [initialSlots, overrides]);

  const day = days.find((entry) => entry.date === selectedDate) ?? days[0];
  const selectedSlot = day?.slots.find((slot) => slot.id === selectedSlotId) ?? null;

  const dateLabel = useMemo(() => {
    if (!day) return '';
    return DATE_LABEL_FORMATTER.format(new Date(`${day.date}T00:00:00`));
  }, [day]);

  function handleDateChange(date: string) {
    setSelectedDate(date);
    setSelectedSlotId(null);
  }

  function handleBooked(slotId: string) {
    setOverrides((prev) => ({ ...prev, [slotId]: 'booked' }));
  }

  if (days.length === 0) {
    return (
      <section className="px-5 pb-10 pt-2">
        <div className="rounded-[20px] border border-border bg-bg-raised px-4 py-10 text-center">
          <p className="text-[15px] font-semibold text-ink">Мастер пока не открыл запись</p>
          <p className="mt-1 text-sm text-ink-faint">
            Загляните чуть позже, новые окна появятся здесь
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="booking-heading" className="px-5 pb-28 pt-2">
      <h2 id="booking-heading" className="sr-only">
        Запись онлайн
      </h2>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Дата">
        {days.map((entry) => {
          const isSelected = entry.date === selectedDate;
          return (
            <button
              key={entry.date}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleDateChange(entry.date)}
              className={cn(
                'flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-2xl border py-2.5 text-sm',
                isSelected
                  ? 'border-accent bg-accent text-accent-contrast'
                  : 'border-border text-ink',
              )}
            >
              <span
                className={cn(
                  'text-[11px]',
                  isSelected ? 'text-accent-contrast/80' : 'text-ink-faint',
                )}
              >
                {entry.weekdayShort}
              </span>
              <span className="text-[15px] font-semibold">{entry.dayNumber}</span>
            </button>
          );
        })}
      </div>

      <p className="mb-3 text-sm text-ink-soft">
        {dateLabel ? `Свободные окна · ${dateLabel}` : ''}
      </p>

      <div className="grid grid-cols-3 gap-2">
        {day?.slots.map((slot) => {
          const isBooked = slot.status === 'booked';
          const isSelected = slot.id === selectedSlotId;
          return (
            <button
              key={slot.id}
              type="button"
              aria-pressed={isSelected}
              disabled={isBooked}
              onClick={() => setSelectedSlotId(slot.id)}
              className={cn(
                'rounded-full border py-2.5 text-center font-mono text-[13.5px] font-semibold tabular-nums',
                isSelected
                  ? 'border-accent bg-accent text-accent-contrast'
                  : isBooked
                    ? 'border-border bg-bg-sunken text-ink-faint line-through'
                    : 'border-border text-ink hover:bg-bg-sunken',
              )}
            >
              {slot.time}
            </button>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
        <Button
          size="default"
          className="w-full"
          disabled={!selectedSlot}
          onClick={() => setSheetOpen(true)}
        >
          {selectedSlot ? `Записаться на ${selectedSlot.time}` : 'Выберите время'}
        </Button>
      </div>

      <BookingSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        org={org}
        slot={selectedSlot}
        dateLabel={dateLabel}
        onBooked={handleBooked}
      />
    </section>
  );
}
