'use client';

import { CheckCircle } from '@phosphor-icons/react';
import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { formatPrice } from '@/lib/format';

import type { DayAvailability, PublicOrganization, PublicService, TimeSlot } from '../types';

interface BookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: PublicOrganization;
  service: PublicService;
  day: DayAvailability | undefined;
  slot: TimeSlot | null;
}

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat('ru', {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
});

/**
 * Guest-details step of the booking flow. Submission is not wired to the
 * API yet — `POST /bookings` lands with the Booking module (TASKS.md B-2,
 * B-8) — so this intentionally ends in a client-only confirmation state.
 */
export function BookingSheet({ open, onOpenChange, org, service, day, slot }: BookingSheetProps) {
  const nameId = useId();
  const phoneId = useId();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+371 ');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle');

  if (!slot || !day) return null;

  const dateLabel = DATE_LABEL_FORMATTER.format(new Date(`${day.date}T00:00:00`));
  const canSubmit = name.trim().length >= 2 && phone.trim().length >= 8;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setStatus('submitting');
    window.setTimeout(() => setStatus('done'), 400);
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
          <Button
            variant="secondary"
            className="mt-2 w-full"
            onClick={() => handleOpenChange(false)}
          >
            Готово
          </Button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Ваши данные"
      description={`${service.name} · ${dateLabel}, ${slot.time}`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        <div className="flex items-center justify-between rounded-xl bg-bg-sunken px-3.5 py-3 text-sm">
          <span className="text-ink-soft">К оплате в салоне</span>
          <span className="font-mono font-semibold text-ink">
            {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
          </span>
        </div>
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
