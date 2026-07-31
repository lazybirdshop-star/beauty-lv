'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';

import { BookingSheet } from './booking-sheet';
import type { DayAvailability, PublicOrganization } from '../types';

interface BookingCalendarProps {
  org: PublicOrganization;
  availabilityByService: Record<string, DayAvailability[]>;
  initialServiceId?: string;
}

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' });

/**
 * The page's hero and primary conversion path: service → date → slot →
 * confirm. Every step renders synchronously from server-precomputed
 * availability (see mock-data.ts) — no artificial loading delay, per the
 * "maximally fast interface" requirement.
 */
export function BookingCalendar({
  org,
  availabilityByService,
  initialServiceId,
}: BookingCalendarProps) {
  const defaultServiceId =
    initialServiceId && org.services.some((item) => item.id === initialServiceId)
      ? initialServiceId
      : org.services[0]!.id;
  const [serviceId, setServiceId] = useState(defaultServiceId);
  const days = availabilityByService[serviceId] ?? [];
  const firstOpenDay = days.find((day) => day.isOpen) ?? days[0];

  const [selectedDate, setSelectedDate] = useState(firstOpenDay?.date);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const service = org.services.find((item) => item.id === serviceId)!;
  const day = days.find((entry) => entry.date === selectedDate) ?? days[0];
  const selectedSlot = day?.slots.find((slot) => slot.iso === selectedIso) ?? null;

  const dateLabel = useMemo(() => {
    if (!day) return '';
    return DATE_LABEL_FORMATTER.format(new Date(`${day.date}T00:00:00`));
  }, [day]);

  function handleServiceChange(nextServiceId: string) {
    setServiceId(nextServiceId);
    setSelectedIso(null);
    const nextDays = availabilityByService[nextServiceId] ?? [];
    const nextOpenDay =
      nextDays.find((d) => d.date === selectedDate && d.isOpen) ?? nextDays.find((d) => d.isOpen);
    setSelectedDate(nextOpenDay?.date);
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    setSelectedIso(null);
  }

  return (
    <section aria-labelledby="booking-heading" className="px-5 pb-28 pt-2">
      <h2 id="booking-heading" className="sr-only">
        Запись онлайн
      </h2>

      {org.services.length > 1 ? (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Услуга">
          {org.services.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === serviceId}
              onClick={() => handleServiceChange(item.id)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-left text-sm font-semibold transition-colors',
                item.id === serviceId
                  ? 'border-accent bg-accent text-accent-contrast'
                  : 'border-border text-ink hover:bg-bg-sunken',
              )}
            >
              {item.name}
              <span
                className={cn(
                  'ml-2 font-mono text-xs font-normal',
                  item.id === serviceId ? 'text-accent-contrast/80' : 'text-ink-faint',
                )}
              >
                {item.durationMinutes} мин
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Дата">
        {days.map((entry) => {
          const isSelected = entry.date === selectedDate;
          const isDisabled = !entry.isOpen || entry.slots.length === 0;
          return (
            <button
              key={entry.date}
              type="button"
              role="tab"
              aria-selected={isSelected}
              disabled={isDisabled}
              onClick={() => handleDateChange(entry.date)}
              className={cn(
                'flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-2xl border py-2.5 text-sm',
                isSelected
                  ? 'border-accent bg-accent text-accent-contrast'
                  : 'border-border text-ink',
                isDisabled && !isSelected && 'opacity-40',
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
        {service.name} · {service.durationMinutes} мин ·{' '}
        {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
        {day ? <> · {dateLabel}</> : null}
      </p>

      {day && day.slots.length > 0 ? (
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Время">
          {day.slots.map((slot) => (
            <button
              key={slot.iso}
              type="button"
              role="tab"
              aria-selected={slot.iso === selectedIso}
              disabled={!slot.available}
              onClick={() => setSelectedIso(slot.iso)}
              className={cn(
                'rounded-full border py-2.5 text-center font-mono text-[13.5px] font-semibold tabular-nums',
                slot.iso === selectedIso
                  ? 'border-accent bg-accent text-accent-contrast'
                  : slot.available
                    ? 'border-border text-ink hover:bg-bg-sunken'
                    : 'border-border bg-bg-sunken text-ink-faint line-through',
              )}
            >
              {slot.time}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-bg-raised px-4 py-8 text-center text-sm text-ink-faint">
          {day?.isOpen ? 'На эту дату свободных слотов нет' : 'В этот день салон не работает'}
        </div>
      )}

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
        service={service}
        day={day}
        slot={selectedSlot}
      />
    </section>
  );
}
