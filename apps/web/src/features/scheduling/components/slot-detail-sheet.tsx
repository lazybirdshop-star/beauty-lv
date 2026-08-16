'use client';

import { Lock, Phone, TrashSimple } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';

import { FALLBACK_TIMEZONE } from '@/lib/civil-date';
import { fmt, useLocale, useT } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { formatDateTime, formatPrice } from '@/lib/format';

import { getBookingStatusMeta } from '../../bookings/status-meta';
import type { Booking } from '../../bookings/types';
import type { PublishedSlot } from '../types';
import { civilDateTimeToIso, civilTimeValue, toDateKey } from '../week';

interface SlotDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: PublishedSlot | null;
  /** Present when the window is booked — the client the master wants to see. */
  booking: Booking | null;
  onReschedule: (slotId: string, startsAt: string) => Promise<void>;
  onDelete: (slotId: string) => void;
  busy: boolean;
}

function longDateTime(iso: string, locale: string, timeZone?: string): string {
  return formatDateTime(iso, locale, { day: 'numeric', month: 'long', weekday: 'long' }, timeZone);
}

/** Booked window: show who is coming. Nothing here is editable — moving someone's appointment silently would be worse than making the master cancel it explicitly. */
function BookedSlotView({ slot, booking }: { slot: PublishedSlot; booking: Booking | null }) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  if (!booking) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-2xl bg-bg-sunken/70 px-4 py-3 text-sm text-ink-soft">
          {t.schedule.bookingMissing}
        </p>
      </div>
    );
  }

  const meta = getBookingStatusMeta(t)[booking.status];
  const total = booking.items.reduce((sum, item) => sum + item.priceAmountSnapshot, 0);
  const currency = booking.items[0]?.priceCurrencySnapshot ?? 'EUR';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
          <Lock size={15} weight="fill" className="text-ink-faint" />
          {longDateTime(slot.startsAt, locale, timeZone)}
        </span>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      <div className="rounded-2xl bg-bg-sunken/70 px-4 py-3.5">
        <p className="font-display text-[22px] leading-tight text-ink">{booking.guestName}</p>
        <p className="mt-1 text-sm text-ink-soft">
          {booking.items.map((item) => item.serviceNameSnapshot).join(', ')}
        </p>
        {/* Price in the data face: money is data, and the display face is
            reserved for titles (Т-1 — prices were split between the two). */}
        <p className="mt-2 flex items-baseline justify-between gap-3 border-t border-border pt-2">
          <span className="text-sm text-ink-soft">{t.schedule.price}</span>
          <span className="font-mono text-base font-semibold tabular-nums text-ink">
            {formatPrice(total, currency)}
          </span>
        </p>
      </div>

      {booking.guestPhone ? (
        <Button variant="secondary" asChild className="w-full">
          <a href={`tel:${booking.guestPhone.replace(/\s/g, '')}`}>
            <Phone size={16} weight="fill" />
            {booking.guestPhone}
          </a>
        </Button>
      ) : null}

      {booking.guestInstagram ? (
        <p className="text-center text-sm text-ink-soft">Instagram: @{booking.guestInstagram}</p>
      ) : null}

      {booking.notes ? (
        <p className="rounded-2xl bg-bg-sunken/70 px-4 py-3 text-sm text-ink-soft">
          {booking.notes}
        </p>
      ) : null}

      <p className="text-center text-xs text-ink-soft">{t.schedule.freeUpHint}</p>
    </div>
  );
}

function FreeSlotForm({
  slot,
  onReschedule,
  onDelete,
  busy,
}: {
  slot: PublishedSlot;
  onReschedule: (slotId: string, startsAt: string) => Promise<void>;
  onDelete: (slotId: string) => void;
  busy: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const [date, setDate] = useState(() => toDateKey(slot.startsAt, timeZone));
  const [time, setTime] = useState(() => civilTimeValue(slot.startsAt, locale, timeZone));
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    /* Дата и час, названные мастером, — гражданские и принадлежат салону. */
    const next = new Date(civilDateTimeToIso(date, time, timeZone ?? FALLBACK_TIMEZONE));
    if (Number.isNaN(next.getTime())) {
      setError(t.schedule.checkDateTime);
      return;
    }
    if (next.getTime() <= Date.now()) {
      setError(t.schedule.pastReschedule);
      return;
    }

    try {
      await onReschedule(slot.id, next.toISOString());
    } catch {
      setError(t.schedule.rescheduleFailed);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="slot-date" className="text-xs font-semibold text-ink-soft">
            {t.schedule.date}
          </label>
          <Input
            id="slot-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="slot-time" className="text-xs font-semibold text-ink-soft">
            {t.schedule.time}
          </label>
          <Input
            id="slot-time"
            type="time"
            step={300}
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </div>
      </div>

      {error ? <FieldError>{error}</FieldError> : null}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? t.common.saving : t.schedule.reschedule}
      </Button>

      {/* Asks first: deleting a published window changes what clients can
          book, and it used to fire on the first tap (audit P1). */}
      <Button
        type="button"
        variant="secondary"
        className="w-full text-danger"
        disabled={busy}
        onClick={() => setConfirmingDelete(true)}
      >
        <TrashSimple size={16} />
        {t.schedule.deleteSlot}
      </Button>

      <ConfirmSheet
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={t.schedule.deleteSlotTitle}
        description={fmt(t.schedule.deleteSlotText, {
          time: longDateTime(slot.startsAt, locale, timeZone),
        })}
        confirmLabel={t.schedule.deleteSlot}
        loading={busy}
        onConfirm={() => {
          setConfirmingDelete(false);
          onDelete(slot.id);
        }}
      />
    </form>
  );
}

export function SlotDetailSheet({
  open,
  onOpenChange,
  slot,
  booking,
  onReschedule,
  onDelete,
  busy,
}: SlotDetailSheetProps) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  if (!slot) return null;

  const isBooked = slot.status === 'booked';

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={isBooked ? t.schedule.bookingAtTime : t.schedule.freeSlot}
      description={isBooked ? undefined : longDateTime(slot.startsAt, locale, timeZone)}
    >
      {isBooked ? (
        <BookedSlotView slot={slot} booking={booking} />
      ) : (
        <FreeSlotForm
          key={slot.id}
          slot={slot}
          onReschedule={onReschedule}
          onDelete={onDelete}
          busy={busy}
        />
      )}
    </Sheet>
  );
}
