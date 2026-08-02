'use client';

import { CheckCircle, Warning } from '@phosphor-icons/react';
import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { ApiError } from '@/lib/api-error';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

import { createGuestBooking } from '../api';
import { ServicePicker } from './service-picker';
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
  'h-12 w-full rounded-xl border border-border bg-bg-raised px-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent-soft';

const LABEL_CLASS = 'text-xs font-semibold text-ink-soft';

/** Guest-details step of the booking flow — submits a real `POST public-bookings`. */
export function BookingSheet({
  open,
  onOpenChange,
  org,
  slot,
  dateLabel,
  onBooked,
}: BookingSheetProps) {
  /** Lets the footer's submit button drive the form it sits outside of. */
  const formId = useId();
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
        <div className="flex flex-col items-center gap-4 pb-1 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle size={34} weight="fill" />
          </span>

          <div>
            <p className="font-display text-[24px] leading-tight text-ink">{name}, ждём вас</p>
            <p className="mt-1.5 text-sm text-ink-soft">
              {dateLabel.toLowerCase()} в {slot.time}
            </p>
          </div>

          <div className="w-full rounded-2xl bg-bg-sunken/70 px-4 py-3 text-left">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink-soft">{service?.name}</span>
              {service ? (
                <span className="font-display text-lg text-ink">
                  {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
                </span>
              ) : null}
            </div>
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
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Подтвердите запись"
      description={`${dateLabel} · ${slot.time}`}
      footer={
        <Button
          type="submit"
          form={formId}
          disabled={!canSubmit || status === 'submitting'}
          className="h-14 w-full shadow-lifted"
        >
          {status === 'submitting'
            ? 'Отправляем…'
            : service
              ? `Записаться · ${formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}`
              : 'Записаться'}
        </Button>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <span className={LABEL_CLASS}>Услуга</span>
          <ServicePicker services={org.services} selectedId={serviceId} onSelect={setServiceId} />
        </div>

        <div className="flex flex-col gap-1.5">
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

        <div className="flex flex-col gap-1.5">
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
            className={cn(INPUT_CLASS, 'tabular-nums')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={instagramId} className={LABEL_CLASS}>
            Instagram <span className="font-normal text-ink-faint">— необязательно</span>
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

        {status === 'error' || status === 'blocked' ? (
          <p
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger"
          >
            <Warning size={17} weight="fill" className="mt-0.5 shrink-0" />
            {status === 'error'
              ? 'Это окно уже заняли. Выберите другое время и попробуйте снова.'
              : 'Не удалось создать запись. Свяжитесь с мастером напрямую.'}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}
