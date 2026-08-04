'use client';

import { Lock, Phone, TrashSimple } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';

import { useT } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { formatPrice } from '@/lib/format';

import { getBookingStatusMeta } from '../../bookings/status-meta';
import type { Booking } from '../../bookings/types';
import type { PublishedSlot } from '../types';
import { toDateKey } from '../week';

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

function timeValue(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function longDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Booked window: show who is coming. Nothing here is editable — moving someone's appointment silently would be worse than making the master cancel it explicitly. */
function BookedSlotView({ slot, booking }: { slot: PublishedSlot; booking: Booking | null }) {
  const t = useT();
  if (!booking) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-2xl bg-bg-sunken/70 px-4 py-3 text-sm text-ink-soft">
          Окно занято, но запись не найдена в списке — возможно, она была только что изменена.
          Обновите страницу.
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
          {longDateTime(slot.startsAt)}
        </span>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      <div className="rounded-2xl bg-bg-sunken/70 px-4 py-3.5">
        <p className="font-display text-[20px] leading-tight text-ink">{booking.guestName}</p>
        <p className="mt-1 text-sm text-ink-soft">
          {booking.items.map((item) => item.serviceNameSnapshot).join(', ')}
        </p>
        <p className="mt-2 flex items-baseline justify-between gap-3 border-t border-border pt-2">
          <span className="text-sm text-ink-soft">Стоимость</span>
          <span className="font-display text-lg text-ink">{formatPrice(total, currency)}</span>
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

      <p className="text-center text-xs text-ink-soft">
        Чтобы освободить это время, отмените запись в разделе «Записи»
      </p>
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
  const [date, setDate] = useState(() => toDateKey(new Date(slot.startsAt)));
  const [time, setTime] = useState(() => timeValue(slot.startsAt));
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const next = new Date(`${date}T${time}:00`);
    if (Number.isNaN(next.getTime())) {
      setError('Проверьте дату и время');
      return;
    }
    if (next.getTime() <= Date.now()) {
      setError('Нельзя перенести окно в прошлое');
      return;
    }

    try {
      await onReschedule(slot.id, next.toISOString());
    } catch {
      setError('Не удалось перенести — возможно, на это время уже есть окно');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="slot-date" className="text-xs font-semibold text-ink-soft">
            Дата
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
            Время
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

      {error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Сохраняем…' : 'Перенести окно'}
      </Button>

      <Button
        type="button"
        variant="secondary"
        className="w-full text-danger"
        disabled={busy}
        onClick={() => onDelete(slot.id)}
      >
        <TrashSimple size={16} />
        Удалить окно
      </Button>
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
  if (!slot) return null;

  const isBooked = slot.status === 'booked';

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={isBooked ? 'Запись на это время' : 'Свободное окно'}
      description={isBooked ? undefined : longDateTime(slot.startsAt)}
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
