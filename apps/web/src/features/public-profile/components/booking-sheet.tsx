'use client';

import { CheckCircle } from '@phosphor-icons/react';
import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';

import type { PublicOrganization, PublishedSlot } from '../types';

interface BookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: PublicOrganization;
  slot: PublishedSlot | null;
  dateLabel: string;
  onBook: (slotId: string) => void;
  onCancel: (slotId: string) => void;
}

/**
 * Guest-details step of the booking flow. Confirming flips the slot to
 * `booked` (see BookingCalendar); the confirmation screen can cancel right
 * back out of it, which flips the slot to `available` again — both are
 * local state until the Booking module wires `POST /bookings` for real
 * (TASKS.md B-2, B-8).
 */
export function BookingSheet({
  open,
  onOpenChange,
  org,
  slot,
  dateLabel,
  onBook,
  onCancel,
}: BookingSheetProps) {
  const nameId = useId();
  const phoneId = useId();
  const [serviceId, setServiceId] = useState(org.services[0]?.id);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+371 ');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle');

  if (!slot) return null;

  const service = org.services.find((item) => item.id === serviceId) ?? org.services[0];
  const canSubmit = name.trim().length >= 2 && phone.trim().length >= 8 && Boolean(service);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || !slot) return;
    setStatus('submitting');
    window.setTimeout(() => {
      onBook(slot.id);
      setStatus('done');
    }, 400);
  }

  function handleCancelBooking() {
    if (!slot) return;
    onCancel(slot.id);
    handleOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      window.setTimeout(() => {
        setStatus('idle');
        setName('');
        setPhone('+371 ');
      }, 200);
    }
  }

  if (status === 'done') {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange} title="Заявка отправлена">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle size={40} weight="fill" className="text-success" />
          <p className="text-sm text-ink-soft">
            {name}, ждём вас {dateLabel.toLowerCase()} в {slot.time}. Подтверждение придёт по SMS на{' '}
            {phone.trim()}.
          </p>
          <div className="mt-2 flex w-full flex-col gap-2">
            <Button variant="secondary" className="w-full" onClick={() => handleOpenChange(false)}>
              Готово
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleCancelBooking}>
              Отменить запись
            </Button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Ваши данные"
      description={`${dateLabel}, ${slot.time}`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {org.services.length > 1 ? (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink-soft">Услуга</span>
            <div className="flex flex-wrap gap-2">
              {org.services.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === serviceId}
                  onClick={() => setServiceId(item.id)}
                  className={cn(
                    'rounded-full border px-3.5 py-2 text-sm font-semibold',
                    item.id === serviceId
                      ? 'border-accent bg-accent text-accent-contrast'
                      : 'border-border text-ink',
                  )}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className="text-sm font-semibold text-ink-soft">
            Имя
          </label>
          <input
            id={nameId}
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-12 rounded-xl border border-border-strong bg-bg-raised px-3.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            placeholder="Katrīna Liepa"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={phoneId} className="text-sm font-semibold text-ink-soft">
            Телефон
          </label>
          <input
            id={phoneId}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="h-12 rounded-xl border border-border-strong bg-bg-raised px-3.5 font-mono text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <span className="text-xs text-ink-faint">Для SMS-напоминания за 2 часа до визита</span>
        </div>

        {service ? (
          <div className="flex items-center justify-between rounded-xl bg-bg-sunken px-3.5 py-3 text-sm">
            <span className="text-ink-soft">{service.name}</span>
            <span className="font-mono font-semibold text-ink">
              {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
            </span>
          </div>
        ) : null}

        <Button type="submit" disabled={!canSubmit || status === 'submitting'} className="w-full">
          {status === 'submitting' ? 'Отправляем…' : 'Подтвердить запись'}
        </Button>
        <p className="text-center text-xs text-ink-faint">
          {org.name} · {org.address}
        </p>
      </form>
    </Sheet>
  );
}
