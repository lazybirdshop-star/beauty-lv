'use client';

import { CheckCircle, InstagramLogo, Warning } from '@phosphor-icons/react';
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
  const nameId = useId();
  const phoneId = useId();
  const instagramId = useId();
  const [serviceId, setServiceId] = useState(org.services[0]?.id);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+371 ');
  const [instagram, setInstagram] = useState('');
  const [instagramShown, setInstagramShown] = useState(false);
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
        setInstagramShown(false);
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
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {org.services.length > 1 ? (
          <fieldset>
            <legend className={cn(LABEL_CLASS, 'mb-2')}>Услуга</legend>
            {/* Horizontal, so N services cost one row of height instead of N. */}
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              {org.services.map((item) => {
                const isSelected = item.id === serviceId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setServiceId(item.id)}
                    className={cn(
                      'press flex min-w-[130px] shrink-0 cursor-pointer flex-col gap-0.5 rounded-2xl border px-3.5 py-2.5 text-left',
                      isSelected
                        ? 'border-accent bg-accent-soft'
                        : 'border-border bg-bg-raised hover:border-border-strong',
                    )}
                  >
                    <span className="truncate text-[13px] font-semibold text-ink">{item.name}</span>
                    <span className="text-[11px] text-ink-soft">
                      {item.durationMinutes} мин ·{' '}
                      <span
                        className={cn('font-semibold', isSelected ? 'text-accent' : 'text-ink')}
                      >
                        {formatPrice(item.priceAmountMinorUnits, item.priceCurrency)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

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
            className={cn(INPUT_CLASS, 'font-mono')}
          />
        </div>

        {instagramShown ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={instagramId} className={LABEL_CLASS}>
              Instagram
            </label>
            <input
              id={instagramId}
              type="text"
              autoComplete="off"
              autoFocus
              value={instagram}
              onChange={(event) => setInstagram(event.target.value)}
              className={INPUT_CLASS}
              placeholder="username"
            />
          </div>
        ) : (
          /* Optional field stays folded away — it is the main reason the
             form used to need scrolling before the phone was even filled. */
          <button
            type="button"
            onClick={() => setInstagramShown(true)}
            className="press flex cursor-pointer items-center gap-2 self-start rounded-full px-1 py-1 text-[13px] font-semibold text-accent"
          >
            <InstagramLogo size={16} />
            Добавить Instagram
          </button>
        )}

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

        {/* Sticky so the primary action stays reachable while the form scrolls. */}
        <div className="sticky bottom-0 -mx-5 -mb-5 mt-0.5 border-t border-border/60 bg-bg-raised/90 px-5 pb-4 pt-3 backdrop-blur-xl">
          <Button
            type="submit"
            disabled={!canSubmit || status === 'submitting'}
            className="h-13 w-full shadow-lifted"
          >
            {status === 'submitting'
              ? 'Отправляем…'
              : service
                ? `Записаться · ${formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}`
                : 'Записаться'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
