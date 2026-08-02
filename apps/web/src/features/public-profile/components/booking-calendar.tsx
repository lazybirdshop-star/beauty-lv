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
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' });

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-bg-sunken/70 px-3 py-2.5 text-center">
      <p className="font-display text-lg leading-none text-ink">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-soft">
        {label}
      </p>
    </div>
  );
}

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

  const facts = useMemo(() => {
    const available = days.flatMap((entry) =>
      entry.slots.filter((slot) => slot.status === 'available'),
    );
    const nearest = available[0];
    return {
      servicesCount: org.services.length,
      availableCount: available.length,
      nearestLabel: nearest
        ? SHORT_DATE_FORMATTER.format(new Date(`${nearest.date}T00:00:00`))
        : '—',
    };
  }, [days, org.services.length]);

  function handleDateChange(date: string) {
    setSelectedDate(date);
    setSelectedSlotId(null);
  }

  function handleBooked(slotId: string) {
    setOverrides((prev) => ({ ...prev, [slotId]: 'booked' }));
  }

  if (days.length === 0) {
    return (
      <section className="px-5 pb-12 pt-6">
        <div className="rounded-3xl bg-bg-sunken/70 px-4 py-12 text-center">
          <p className="font-display text-xl text-ink">Запись пока закрыта</p>
          <p className="mt-2 text-sm text-ink-soft">
            Мастер ещё не открыл окна. Загляните чуть позже.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="booking-heading" className="px-5 pb-32 pt-4">
      <h2 id="booking-heading" className="sr-only">
        Запись онлайн
      </h2>

      <div className="grid grid-cols-3 gap-2">
        <Fact label="Услуг" value={String(facts.servicesCount)} />
        <Fact label="Свободно" value={String(facts.availableCount)} />
        <Fact label="Ближайшее" value={facts.nearestLabel} />
      </div>

      <h3 className="mb-3 mt-7 font-display text-[22px] leading-none text-ink">Расписание</h3>

      <div
        className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-2"
        role="tablist"
        aria-label="Дата"
      >
        {days.map((entry) => {
          const isSelected = entry.date === selectedDate;
          return (
            <button
              key={entry.date}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleDateChange(entry.date)}
              className="press flex shrink-0 cursor-pointer flex-col items-center gap-2 focus-visible:outline-none"
            >
              <span
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-[0.06em]',
                  isSelected ? 'text-accent' : 'text-ink-soft',
                )}
              >
                {entry.weekdayShort}
              </span>
              <span
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums',
                  isSelected
                    ? 'bg-accent text-accent-contrast shadow-lifted'
                    : 'bg-bg-sunken/80 text-ink',
                )}
              >
                {entry.dayNumber}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mb-3 mt-5 text-sm text-ink-soft">
        {dateLabel ? `Свободные окна · ${dateLabel}` : ''}
      </p>

      <div className="grid grid-cols-4 gap-2">
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
                'press rounded-full py-3 text-center font-mono text-[13px] font-semibold tabular-nums',
                isSelected
                  ? 'bg-accent text-accent-contrast shadow-lifted'
                  : isBooked
                    ? 'bg-bg-sunken/50 text-ink-faint line-through'
                    : 'cursor-pointer bg-bg-sunken/80 text-ink hover:bg-bg-sunken',
              )}
            >
              {slot.time}
            </button>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[520px] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-bg via-bg/90 to-transparent" />
        <Button
          size="default"
          className="press relative h-14 w-full shadow-lifted"
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
