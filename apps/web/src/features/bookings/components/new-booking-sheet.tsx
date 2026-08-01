'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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

function formatSlotLabel(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NewBookingForm({
  availableSlots,
  services,
  onSubmit,
  submitting,
}: Omit<NewBookingSheetProps, 'open' | 'onOpenChange'>) {
  const [slotId, setSlotId] = useState(availableSlots[0]?.id ?? '');
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('+371 ');
  const [guestInstagram, setGuestInstagram] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const canSubmit = Boolean(slotId) && Boolean(serviceId) && guestName.trim().length >= 2;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!canSubmit) return;
    try {
      await onSubmit({
        publishedSlotId: slotId,
        serviceId,
        guestName,
        guestPhone,
        guestInstagram: guestInstagram.trim() || undefined,
        notes,
      });
    } catch {
      setError('Не удалось создать запись — окно уже могло быть занято');
    }
  }

  if (availableSlots.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Нет свободных опубликованных окон. Сначала опубликуйте окно в Календаре.
      </p>
    );
  }

  if (services.length === 0) {
    return <p className="text-sm text-ink-soft">Сначала добавьте хотя бы одну услугу.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink-soft">Окно</span>
        <div className="flex flex-wrap gap-2">
          {availableSlots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              aria-pressed={slot.id === slotId}
              onClick={() => setSlotId(slot.id)}
              className={cn(
                'rounded-full border px-3.5 py-2 text-sm font-semibold',
                slot.id === slotId
                  ? 'border-accent bg-accent text-accent-contrast'
                  : 'border-border text-ink',
              )}
            >
              {formatSlotLabel(slot.startsAt)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink-soft">Услуга</span>
        <div className="flex flex-wrap gap-2">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              aria-pressed={service.id === serviceId}
              onClick={() => setServiceId(service.id)}
              className={cn(
                'rounded-full border px-3.5 py-2 text-sm font-semibold',
                service.id === serviceId
                  ? 'border-accent bg-accent text-accent-contrast'
                  : 'border-border text-ink',
              )}
            >
              {service.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="booking-guest-name" className="text-sm font-semibold text-ink-soft">
          Имя клиента
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
          Телефон
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
          Заметка
        </label>
        <Textarea
          id="booking-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      {error ? <span className="text-xs text-danger">{error}</span> : null}

      <Button type="submit" disabled={!canSubmit || submitting} className="w-full">
        {submitting ? 'Создаём…' : 'Создать запись'}
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Новая запись">
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
