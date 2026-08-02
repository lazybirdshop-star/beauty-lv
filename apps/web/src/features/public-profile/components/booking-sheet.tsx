'use client';

import { CalendarBlank, CheckCircle, Clock, Warning } from '@phosphor-icons/react';
import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { ApiError } from '@/lib/api-error';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

import { createGuestBooking } from '../api';
import type { PublicOrganization, PublishedSlot } from '../types';

interface BookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: PublicOrganization;
  slot: PublishedSlot | null;
  dateLabel: string;
  onBooked: (slotId: string) => void;
}

const INPUT_CLASS =
  'h-[52px] w-full rounded-2xl border border-border bg-bg-raised px-4 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent-soft';

const LABEL_CLASS = 'text-[13px] font-semibold text-ink-soft';

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 rounded-full bg-bg-raised px-3.5 py-2 text-sm font-semibold text-ink shadow-soft">
      <span className="text-accent">{icon}</span>
      {children}
    </span>
  );
}

/** Guest-details step of the booking flow — submits a real `POST public-bookings`. */
export function BookingSheet({
  open,
  onOpenChange,
  org,
  slot,
  dateLabel,
  onBooked,
}: BookingSheetProps) {
  const nameId = useId();
  const phoneId = useId();
  const instagramId = useId();
  const [serviceId, setServiceId] = useState(org.services[0]?.id);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+371 ');
  const [instagram, setInstagram] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error' | 'blocked'>(
    'idle',
  );

  if (!slot) return null;

  const service = org.services.find((item) => item.id === serviceId) ?? org.services[0];
  const canSubmit = name.trim().length >= 2 && phone.trim().length >= 8 && Boolean(service);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || !slot || !service) return;
    setStatus('submitting');
    try {
      await createGuestBooking(org.slug, {
        publishedSlotId: slot.id,
        serviceId: service.id,
        guestName: name.trim(),
        guestPhone: phone.trim(),
        guestInstagram: instagram.trim() || undefined,
      });
      onBooked(slot.id);
      setStatus('done');
    } catch (error) {
      setStatus(error instanceof ApiError && error.status === 403 ? 'blocked' : 'error');
    }
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      window.setTimeout(() => {
        setStatus('idle');
        setName('');
        setPhone('+371 ');
        setInstagram('');
      }, 200);
    }
  }

  if (status === 'done') {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange} title="Заявка отправлена">
        <div className="flex flex-col items-center gap-4 pb-1 pt-2 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle size={34} weight="fill" />
          </span>

          <div>
            <p className="font-display text-[24px] leading-tight text-ink">{name}, ждём вас</p>
            <p className="mt-1.5 text-sm text-ink-soft">
              {dateLabel.toLowerCase()} в {slot.time}
            </p>
          </div>

          <div className="w-full rounded-3xl bg-bg-sunken/70 px-4 py-4 text-left">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink-soft">{service?.name}</span>
              {service ? (
                <span className="font-display text-lg text-ink">
                  {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 border-t border-border pt-2 text-xs text-ink-soft">
              Подтверждение придёт по SMS на {phone.trim()}
            </p>
          </div>

          {org.phone ? (
            <p className="text-xs text-ink-soft">
              Отменить или перенести — по телефону мастера{' '}
              <a href={`tel:${org.phone.replace(/\s/g, '')}`} className="font-semibold text-accent">
                {org.phone}
              </a>
            </p>
          ) : null}

          <Button variant="secondary" className="w-full" onClick={() => handleOpenChange(false)}>
            Готово
          </Button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange} title="Подтвердите запись">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-2 rounded-3xl bg-bg-sunken/70 p-3">
          <Chip icon={<CalendarBlank size={16} weight="fill" />}>{dateLabel}</Chip>
          <Chip icon={<Clock size={16} weight="fill" />}>{slot.time}</Chip>
        </div>

        {org.services.length > 1 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className={cn(LABEL_CLASS, 'mb-2')}>Услуга</legend>
            {org.services.map((item) => {
              const isSelected = item.id === serviceId;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setServiceId(item.id)}
                  className={cn(
                    'press flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left',
                    isSelected
                      ? 'border-accent bg-accent-soft'
                      : 'border-border bg-bg-raised hover:border-border-strong',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-ink">
                      {item.name}
                    </span>
                    <span className="block text-xs text-ink-soft">{item.durationMinutes} мин</span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 font-display text-lg',
                      isSelected ? 'text-accent' : 'text-ink',
                    )}
                  >
                    {formatPrice(item.priceAmountMinorUnits, item.priceCurrency)}
                  </span>
                </button>
              );
            })}
          </fieldset>
        ) : null}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor={nameId} className={LABEL_CLASS}>
              Имя
            </label>
            <input
              id={nameId}
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={INPUT_CLASS}
              placeholder="Katrīna Liepa"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={phoneId} className={LABEL_CLASS}>
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
              className={cn(INPUT_CLASS, 'font-mono')}
            />
            <span className="text-xs text-ink-soft">Для SMS-напоминания за 2 часа до визита</span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={instagramId} className={LABEL_CLASS}>
              Instagram <span className="font-normal text-ink-soft">(необязательно)</span>
            </label>
            <input
              id={instagramId}
              type="text"
              autoComplete="off"
              value={instagram}
              onChange={(event) => setInstagram(event.target.value)}
              className={INPUT_CLASS}
              placeholder="username"
            />
          </div>
        </div>

        {service ? (
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <span className="text-sm text-ink-soft">Итого</span>
            <span className="font-display text-[26px] leading-none text-ink">
              {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
            </span>
          </div>
        ) : null}

        {status === 'error' || status === 'blocked' ? (
          <p
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
            {status === 'error'
              ? 'Это окно уже заняли. Выберите другое время и попробуйте снова.'
              : 'Не удалось создать запись. Свяжитесь с мастером напрямую.'}
          </p>
        ) : null}

        {/* Sticky so the primary action stays reachable while the form scrolls. */}
        <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-border/60 bg-bg-raised/90 px-5 pb-5 pt-4 backdrop-blur-xl">
          <Button
            type="submit"
            disabled={!canSubmit || status === 'submitting'}
            className="h-14 w-full shadow-lifted"
          >
            {status === 'submitting' ? 'Отправляем…' : 'Подтвердить запись'}
          </Button>
          <p className="mt-3 text-center text-xs text-ink-soft">
            {org.name}
            {org.address ? ` · ${org.address}` : ''}
          </p>
        </div>
      </form>
    </Sheet>
  );
}
