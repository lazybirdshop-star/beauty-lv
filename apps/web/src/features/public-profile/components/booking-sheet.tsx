'use client';

import { ArrowLeft, CheckCircle, Warning } from '@phosphor-icons/react';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { ApiError } from '@/lib/api-error';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

import { createGuestBooking, fetchAvailability } from '../api';
import { cartTotals, formatDuration, suggestedAddons } from '../booking-cart';
import { AddonsStep, ServicesStep, TimeStep, type SlotDay } from './booking-steps';
import type { PublicOrganization, PublishedSlot } from '../types';

interface BookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: PublicOrganization;
  /** Tapped in the calendar, if any — offered back at the time step when the visit still fits it. */
  preferredSlot: PublishedSlot | null;
  onBooked: (slotId: string) => void;
}

type Step = 'services' | 'addons' | 'time' | 'contacts';

const INPUT_CLASS =
  'h-12 w-full rounded-xl border border-border bg-bg-raised px-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent-soft';

const LABEL_CLASS = 'text-xs font-semibold text-ink-soft';

const DAY_LABEL = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const FULL_DATE_LABEL = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const STEP_TITLE: Record<Step, string> = {
  services: 'Выберите услуги',
  addons: 'Добавить к записи?',
  time: 'Когда вам удобно?',
  contacts: 'Ваши контакты',
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * The booking flow: services → suggestions → time → contacts.
 *
 * Services come before time, not after, because the length of the visit
 * decides which windows can even be offered — a two-hour chain must never be
 * shown a start with somebody booked an hour into it. The schedule is
 * therefore fetched only once the cart exists.
 */
export function BookingSheet({
  open,
  onOpenChange,
  org,
  preferredSlot,
  onBooked,
}: BookingSheetProps) {
  const formId = useId();
  const nameId = useId();
  const phoneId = useId();
  const instagramId = useId();

  const [step, setStep] = useState<Step>('services');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  // Stored together with the length it was fetched for, so "is this list
  // current?" is a comparison instead of a second loading flag that has to
  // be kept in step with it.
  const [loaded, setLoaded] = useState<{ duration: number; days: SlotDay[] } | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+371 ');
  const [instagram, setInstagram] = useState('');
  const [conflict, setConflict] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error' | 'blocked'>(
    'idle',
  );

  const selectedServices = useMemo(
    () => org.services.filter((service) => selectedIds.includes(service.id)),
    [org.services, selectedIds],
  );
  const totals = cartTotals(selectedServices);
  const addons = useMemo(() => suggestedAddons(org, selectedIds), [org, selectedIds]);

  const fresh = loaded?.duration === totals.durationMinutes;
  const days = fresh ? loaded.days : [];
  const loadingSlots = step === 'time' && !fresh;

  /*
   * The window list depends on the cart, so it is fetched when the time step
   * opens rather than up front. `cancelled` guards the race where the client
   * steps back, changes the cart and returns before the first response lands
   * — without it the older, longer-duration answer could overwrite the newer
   * one.
   */
  useEffect(() => {
    if (step !== 'time' || totals.durationMinutes === 0) return;
    if (loaded?.duration === totals.durationMinutes) return;

    let cancelled = false;
    const duration = totals.durationMinutes;

    fetchAvailability(org.slug, duration)
      .then((slots) => {
        if (!cancelled) setLoaded({ duration, days: groupByDay(slots) });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ duration, days: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [step, totals.durationMinutes, org.slug, loaded?.duration]);

  /*
   * The chosen day and window are derived, never synced through an effect.
   * A cart change reshuffles the list underneath them, and re-deriving is
   * what keeps a stale id from surviving into the request.
   */
  const day = days.find((item) => item.date === activeDate) ?? days[0] ?? null;
  const allSlots = days.flatMap((item) => item.slots);
  // The window tapped in the calendar is only a preference: a longer cart may
  // no longer fit it, and it is dropped rather than silently booked.
  const effectiveSlotId = allSlots.some((slot) => slot.id === slotId)
    ? slotId
    : (allSlots.find((slot) => slot.id === preferredSlot?.id)?.id ?? null);
  const chosenSlot = allSlots.find((slot) => slot.id === effectiveSlotId) ?? null;

  function toggleService(serviceId: string) {
    setSelectedIds((prev) =>
      prev.includes(serviceId) ? prev.filter((item) => item !== serviceId) : [...prev, serviceId],
    );
  }

  function reset() {
    setStep('services');
    setSelectedIds([]);
    setSlotId(null);
    setLoaded(null);
    setActiveDate(null);
    setConflict('');
    setStatus('idle');
    setName('');
    setPhone('+371 ');
    setInstagram('');
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    // Cleared after the close animation so the sheet does not visibly rewind
    // to step one on its way out.
    if (!next) window.setTimeout(reset, 200);
  }

  function goNext() {
    if (step === 'services') {
      setStep(addons.length > 0 ? 'addons' : 'time');
      return;
    }
    if (step === 'addons') {
      setStep('time');
      return;
    }
    if (step === 'time') setStep('contacts');
  }

  function goBack() {
    if (step === 'contacts') {
      setStep('time');
      return;
    }
    if (step === 'time') {
      setStep(addons.length > 0 ? 'addons' : 'services');
      return;
    }
    if (step === 'addons') setStep('services');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!chosenSlot || selectedIds.length === 0) return;
    setStatus('submitting');
    try {
      await createGuestBooking(org.slug, {
        publishedSlotId: chosenSlot.id,
        serviceIds: selectedIds,
        guestName: name.trim(),
        guestPhone: phone.trim(),
        guestInstagram: instagram.trim() || undefined,
      });
      onBooked(chosenSlot.id);
      setStatus('done');
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setStatus('blocked');
        return;
      }
      setConflict(error instanceof ApiError && error.status === 409 ? error.message : '');
      setStatus('error');
    }
  }

  if (status === 'done' && chosenSlot) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange} title="Заявка отправлена">
        <div className="flex flex-col items-center gap-4 pb-1 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle size={34} weight="fill" />
          </span>

          <div>
            <p className="font-display text-[24px] leading-tight text-ink">{name}, ждём вас</p>
            <p className="mt-1.5 text-sm text-ink-soft">
              {FULL_DATE_LABEL.format(new Date(chosenSlot.iso))} в {chosenSlot.time}
            </p>
          </div>

          <div className="flex w-full flex-col gap-1.5 rounded-2xl bg-bg-sunken/70 px-4 py-3 text-left">
            {selectedServices.map((service) => (
              <div key={service.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-ink-soft">{service.name}</span>
                <span className="shrink-0 text-sm text-ink">
                  {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2">
              <span className="text-sm text-ink-soft">
                {formatDuration(totals.durationMinutes)}
              </span>
              <span className="font-display text-lg text-ink">
                {formatPrice(totals.priceMinorUnits, totals.currency)}
              </span>
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

  const canContinue =
    step === 'services' || step === 'addons'
      ? selectedIds.length > 0
      : step === 'time'
        ? Boolean(chosenSlot)
        : name.trim().length >= 2 && phone.trim().length >= 8;

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title={STEP_TITLE[step]}
      description={
        selectedIds.length > 0
          ? `${formatDuration(totals.durationMinutes)} · ${formatPrice(totals.priceMinorUnits, totals.currency)}`
          : undefined
      }
      footer={
        <div className="flex gap-2">
          {step !== 'services' ? (
            <Button
              type="button"
              variant="secondary"
              onClick={goBack}
              aria-label="Назад"
              className="h-14 w-14 shrink-0"
            >
              <ArrowLeft size={18} weight="bold" />
            </Button>
          ) : null}

          {step === 'contacts' ? (
            <Button
              type="submit"
              form={formId}
              disabled={!canContinue || status === 'submitting'}
              className="h-14 flex-1 shadow-lifted"
            >
              {status === 'submitting'
                ? 'Отправляем…'
                : `Записаться · ${formatPrice(totals.priceMinorUnits, totals.currency)}`}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canContinue}
              className="h-14 flex-1 shadow-lifted"
            >
              {step === 'addons' && selectedIds.length > 0 && addons.length > 0
                ? 'Дальше'
                : step === 'time'
                  ? 'К контактам'
                  : 'Выбрать время'}
            </Button>
          )}
        </div>
      }
    >
      {step === 'services' ? (
        <ServicesStep org={org} selectedIds={selectedIds} onToggle={toggleService} />
      ) : null}

      {step === 'addons' ? (
        <AddonsStep addons={addons} selectedIds={selectedIds} onToggle={toggleService} />
      ) : null}

      {step === 'time' ? (
        <TimeStep
          days={days}
          loading={loadingSlots}
          activeDate={day?.date ?? null}
          onPickDate={setActiveDate}
          selectedSlotId={effectiveSlotId}
          onPickSlot={setSlotId}
          durationMinutes={totals.durationMinutes}
        />
      ) : null}

      {step === 'contacts' ? (
        <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {chosenSlot ? (
            <p className="rounded-2xl bg-bg-sunken/70 px-3.5 py-2.5 text-[13px] text-ink-soft">
              {FULL_DATE_LABEL.format(new Date(chosenSlot.iso))} в{' '}
              <span className="font-semibold text-ink">{chosenSlot.time}</span>
            </p>
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
              value={instagram}
              onChange={(event) => setInstagram(event.target.value)}
              className={INPUT_CLASS}
              placeholder="@username"
            />
          </div>

          {status === 'error' || status === 'blocked' ? (
            <p
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger"
            >
              <Warning size={17} weight="fill" className="mt-0.5 shrink-0" />
              {status === 'blocked'
                ? 'Не удалось создать запись. Свяжитесь с мастером напрямую.'
                : conflict || 'Это время уже заняли. Выберите другое и попробуйте снова.'}
            </p>
          ) : null}
        </form>
      ) : null}
    </Sheet>
  );
}

interface ApiSlot {
  id: string;
  startsAt: string;
  status: 'available' | 'booked';
}

/** Server order is chronological, so days and their windows come out sorted for free. */
function groupByDay(slots: ApiSlot[]): SlotDay[] {
  const byDate = new Map<string, SlotDay>();

  for (const slot of slots) {
    const date = new Date(slot.startsAt);
    const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const day = byDate.get(key) ?? { date: key, label: DAY_LABEL.format(date), slots: [] };
    day.slots.push({
      id: slot.id,
      date: key,
      time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
      iso: slot.startsAt,
      status: slot.status,
    });
    byDate.set(key, day);
  }

  return [...byDate.values()];
}
