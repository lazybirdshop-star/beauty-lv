'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { ApiError } from '@/lib/api-error';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { groupSlotsByDay } from '../../scheduling/group-by-day';
import type { Service } from '../../services/types';
import type { PublishedSlot } from '../../scheduling/types';
import type { CreateBookingInput } from '../types';

interface NewBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableSlots: PublishedSlot[];
  services: Service[];
  onSubmit: (input: CreateBookingInput) => Promise<void>;
  submitting: boolean;
}

function NewBookingForm({
  availableSlots,
  services,
  onSubmit,
  submitting,
}: Omit<NewBookingSheetProps, 'open' | 'onOpenChange'>) {
  const t = useT();
  const locale = useLocale();
  const [slotId, setSlotId] = useState(availableSlots[0]?.id ?? '');
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  /* Grouped by day: 25 published windows used to arrive as one flat sheet of
     ~37 pills — the audit's worst decision point. A day heading turns the
     scan from «which pill» into «which day, then which time». */
  const slotDays = useMemo(() => groupSlotsByDay(availableSlots, locale), [availableSlots, locale]);
  /* Someone wrote asking for a time she never opened; she should not have to
     publish a window to the whole internet just to write that person in. */
  const [mode, setMode] = useState<'slot' | 'custom'>('slot');
  const [customAt, setCustomAt] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('+371 ');
  const [guestInstagram, setGuestInstagram] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const canSubmit =
    (mode === 'slot' ? Boolean(slotId) : Boolean(customAt)) &&
    Boolean(serviceId) &&
    guestName.trim().length >= 2;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!canSubmit) return;
    try {
      await onSubmit({
        ...(mode === 'slot'
          ? { publishedSlotId: slotId }
          : { startsAt: new Date(customAt).toISOString() }),
        serviceIds: [serviceId],
        guestName,
        guestPhone,
        guestInstagram: guestInstagram.trim() || undefined,
        notes,
      });
    } catch (submitError) {
      // The server distinguishes "somebody took this window" from "the visit
      // does not fit here" — collapsing both into one line would send the
      // master back to the same slot over and over.
      setError(
        submitError instanceof ApiError && submitError.status === 409
          ? submitError.message
          : t.bookings.createFailed,
      );
    }
  }

  if (services.length === 0) {
    return <p className="text-sm text-ink-soft">{t.bookings.needService}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink-soft">{t.bookings.when}</span>

        <div className="flex gap-1 rounded-full bg-bg-sunken p-1">
          {(
            [
              ['slot', t.bookings.fromSlots],
              ['custom', t.bookings.customTime],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              aria-pressed={mode === key}
              className={cn(
                'press min-h-11 flex-1 rounded-full px-3 text-sm font-semibold',
                mode === key ? 'bg-bg-raised text-ink shadow-soft' : 'text-ink-soft',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'custom' ? (
          <>
            <Input
              type="datetime-local"
              aria-label={t.bookings.customTime}
              value={customAt}
              onChange={(event) => setCustomAt(event.target.value)}
              className="w-full"
            />
            <span className="text-xs text-ink-soft">{t.bookings.customTimeHint}</span>
          </>
        ) : availableSlots.length === 0 ? (
          <p className="text-sm text-ink-soft">{t.bookings.noSlots}</p>
        ) : null}

        <div className={cn('flex flex-col gap-3', mode === 'custom' && 'hidden')}>
          {slotDays.map((day) => (
            <div key={day.dateKey}>
              <p className="mb-1.5 text-[13px] font-semibold text-ink-soft">
                {day.weekdayShort}, {day.dayNumber} {day.monthShort}
              </p>
              <div className="flex flex-wrap gap-2">
                {day.slots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    aria-pressed={slot.id === slotId}
                    onClick={() => setSlotId(slot.id)}
                    className={cn(
                      'press inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border px-3.5 text-sm font-semibold tabular-nums',
                      slot.id === slotId
                        ? 'border-accent bg-accent text-accent-contrast'
                        : 'border-border text-ink',
                    )}
                  >
                    {formatTime(slot.startsAt, locale)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="booking-service" className="text-sm font-semibold text-ink-soft">
          {t.bookings.service}
        </label>
        {/* A native select, not a pill per service: with a dozen services the
            pill grid was most of the sheet's decision explosion, and the
            platform picker is the product's stated answer for long single
            choices (see Select's own rationale). */}
        <Select
          id="booking-service"
          value={serviceId}
          onChange={(event) => setServiceId(event.target.value)}
        >
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="booking-guest-name" className="text-sm font-semibold text-ink-soft">
          {t.bookings.clientName}
        </label>
        <Input
          id="booking-guest-name"
          required
          value={guestName}
          onChange={(event) => setGuestName(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="booking-guest-phone" className="text-sm font-semibold text-ink-soft">
          {t.bookings.phone}
        </label>
        <Input
          id="booking-guest-phone"
          type="tel"
          value={guestPhone}
          onChange={(event) => setGuestPhone(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="booking-guest-instagram" className="text-sm font-semibold text-ink-soft">
          Instagram
        </label>
        <Input
          id="booking-guest-instagram"
          value={guestInstagram}
          onChange={(event) => setGuestInstagram(event.target.value)}
          placeholder="username"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="booking-notes" className="text-sm font-semibold text-ink-soft">
          {t.bookings.note}
        </label>
        <Textarea
          id="booking-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      {error ? <FieldError>{error}</FieldError> : null}

      <Button type="submit" disabled={!canSubmit || submitting} className="w-full">
        {submitting ? t.bookings.creating : t.bookings.create}
      </Button>
    </form>
  );
}

export function NewBookingSheet({
  open,
  onOpenChange,
  availableSlots,
  services,
  onSubmit,
  submitting,
}: NewBookingSheetProps) {
  const t = useT();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.bookings.new}>
      {open ? (
        <NewBookingForm
          key={availableSlots.length}
          availableSlots={availableSlots}
          services={services}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      ) : null}
    </Sheet>
  );
}
