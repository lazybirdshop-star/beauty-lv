'use client';

import { ArrowLeft, CheckCircle, HourglassMedium, Warning } from '@phosphor-icons/react';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { BookingFollowup } from '../components/booking-followup';
import { Sheet } from '@/components/ui/sheet';
import { ApiError } from '@/lib/api-error';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { fmt, useLocale, useT } from '@/lib/i18n';

import { createGuestBooking, type CreatedGuestBooking, fetchAvailability } from '../api';
import { cartTotals, formatDuration, suggestedAddons } from '../booking-cart';
import { AddonsStep, ServicesStep, TimeStep, type SlotDay } from './booking-steps';
import type { PublicOrganization, PublishedSlot } from '../types';

interface BookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: PublicOrganization;
  /** Tapped in the calendar, if any — offered back at the time step when the visit still fits it. */
  preferredSlot: PublishedSlot | null;
  /** Services chosen before the sheet opened — from a card on the prices page. */
  initialServiceIds?: string[];
  /** A window was chosen in the calendar before the action was pressed. */
  slotChosen?: boolean;
  onBooked: (slotId: string) => void;
}

type Step = 'services' | 'addons' | 'time' | 'contacts';

const INPUT_CLASS =
  'h-12 w-full rounded-[var(--field-radius)] border border-border bg-bg-raised px-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent-soft';

/* Luxury's field is a recess in the velvet (§7): the sunken fill, the quiet
   rule, and the gold 2px ring on focus — the ring appears in the measured
   200ms. */
const LUXURY_INPUT_CLASS =
  'h-12 w-full rounded-[var(--field-radius)] border border-border bg-bg-sunken px-3.5 text-base text-ink outline-none transition-[border-color,box-shadow] duration-200 ease-[var(--ease-style)] placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent';

const LABEL_CLASS = 'text-xs font-semibold text-ink-soft';

/* Minimal's field labels are lowercase, faint and 500 — the world does not
   shout even its captions (§6). */
const MINIMAL_LABEL_CLASS = 'text-xs font-medium text-ink-faint';

/* Luxury's labels are caps with the wide 0.14em tracking — the ceremony
   reads in the letterspacing (§7). */
const LUXURY_LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint';

/* The gold action row of this world: caps 12–13px at 0.16em on the
   world's own timing. */
const LUXURY_BUTTON_CLASS =
  'luxury-action text-[13px] font-semibold uppercase tracking-[var(--action-tracking)]';

const DAY_LABEL_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
const FULL_DATE_LABEL_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
};

/**
 * Progress for a four-stop flow, as segments rather than "шаг 2 из 4": the
 * suggestions step only exists when the master configured one, so a printed
 * count would be a lie half the time. The segments are decorative — the real
 * position is announced through the sheet's own heading.
 */
function StepProgress({
  steps,
  current,
  minimal = false,
  luxury = false,
}: {
  steps: Step[];
  current: Step;
  minimal?: boolean;
  luxury?: boolean;
}) {
  const index = steps.indexOf(current);
  return (
    <div aria-hidden="true" className={cn('mb-4 flex', minimal || luxury ? 'gap-1' : 'gap-1.5')}>
      {steps.map((step, position) => (
        <span
          key={step}
          className={cn(
            /* Minimal's progress is 2px rule segments (§6), Luxury's are 1px
               hairlines (§7); the soft world keeps its rounded bars. */
            minimal
              ? 'h-0.5 flex-1 rounded-none transition-colors'
              : luxury
                ? 'h-px flex-1 rounded-none'
                : 'h-1 flex-1 rounded-full transition-colors',
            position <= index ? 'bg-accent' : luxury ? 'bg-border' : 'bg-bg-sunken',
            /* The freshest segment draws itself in gold — scaleX, 400ms (§7). */
            luxury && position === index && 'anim-luxury-progress',
          )}
        />
      ))}
    </div>
  );
}

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
  initialServiceIds,
  slotChosen = false,
  onBooked,
}: BookingSheetProps) {
  const t = useT();
  const locale = useLocale();
  const FULL_DATE_LABEL = new Intl.DateTimeFormat(locale, FULL_DATE_LABEL_OPTS);
  const formId = useId();
  const nameId = useId();
  const phoneId = useId();
  const instagramId = useId();

  const [step, setStep] = useState<Step>(initialServiceIds?.length ? 'addons' : 'services');
  const [selectedIds, setSelectedIds] = useState<string[]>(initialServiceIds ?? []);
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
  /*
   * Everything the confirmation screen needs, captured the moment the booking
   * is made — not read back off live state.
   *
   * The live state stops describing this booking the instant it succeeds: the
   * window it used disappears from the availability list, so `chosenSlot`
   * became null and the screen either vanished or fell back to asking for a
   * time all over again. A receipt is a fact about something that already
   * happened; it should not be derived from a schedule that has moved on.
   */
  const [receipt, setReceipt] = useState<{
    booking: CreatedGuestBooking;
    guestName: string;
    services: { id: string; name: string; priceAmountMinorUnits: number; priceCurrency: string }[];
    durationMinutes: number;
    priceMinorUnits: number;
    currency: string;
  } | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error' | 'blocked'>(
    'idle',
  );

  /* The Minimal world (§6): hairline materials, 8px fields, 2px progress
     rules, steps changing in a 120ms crossfade. */
  const minimal = org.designPresetKey === 'minimal';
  /* The Luxury world (§7): fields recessed in velvet, caps labels, 1px
     progress hairlines drawn in gold, steps in a slow 500ms fade. */
  const luxury = org.designPresetKey === 'luxury';
  const labelClass = minimal ? MINIMAL_LABEL_CLASS : luxury ? LUXURY_LABEL_CLASS : LABEL_CLASS;
  const inputClass = luxury ? LUXURY_INPUT_CLASS : INPUT_CLASS;

  const selectedServices = useMemo(
    () => org.services.filter((service) => selectedIds.includes(service.id)),
    [org.services, selectedIds],
  );
  const totals = cartTotals(selectedServices);
  const addons = useMemo(() => suggestedAddons(org, selectedIds), [org, selectedIds]);

  const fresh = loaded?.duration === totals.durationMinutes;
  const days = fresh ? loaded.days : [];

  /*
   * The window list depends on the cart, so it is fetched when the time step
   * opens rather than up front. `cancelled` guards the race where the client
   * steps back, changes the cart and returns before the first response lands
   * — without it the older, longer-duration answer could overwrite the newer
   * one.
   */
  useEffect(() => {
    /* Fetched as soon as there is a cart, not when a particular step opens.
       Gating it on the step meant the list was still missing on routes that
       reach the schedule without passing through that step, and an empty list
       renders as "no free time" — which is a different claim entirely. */
    if (!open || totals.durationMinutes === 0) return;
    if (loaded?.duration === totals.durationMinutes) return;

    let cancelled = false;
    const duration = totals.durationMinutes;

    fetchAvailability(org.slug, duration)
      .then((slots) => {
        if (!cancelled) setLoaded({ duration, days: groupByDay(slots, locale) });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ duration, days: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [open, totals.durationMinutes, org.slug, loaded?.duration, locale]);

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
  const chosenSlot =
    allSlots.find((slot) => slot.id === effectiveSlotId) ?? (slotChosen ? preferredSlot : null);

  // Suggestions are skipped entirely when the master configured none, so the
  // progress bar has to describe the route this particular client is taking.
  /* Same route logic as the poster sheet: this is booking behaviour, not
     surface language, so both worlds walk it identically. */
  /*
   * The window list is only fetched once the time step opens, so `chosenSlot`
   * is null at the start and asking it whether the time is settled was a
   * circular question — the step put itself back into the route and the
   * visitor was asked for a time they had just picked.
   *
   * The window carried in from the calendar is trusted until the fetched list
   * actually contradicts it, which is the only moment we learn the cart has
   * outgrown it.
   */
  const carriedSlot = slotChosen ? preferredSlot : null;
  const timeSatisfied =
    carriedSlot !== null && (!fresh || allSlots.some((slot) => slot.id === carriedSlot.id));
  const steps: Step[] = [
    ...(initialServiceIds?.length ? [] : (['services'] as Step[])),
    'addons',
    ...(timeSatisfied ? [] : (['time'] as Step[])),
    'contacts',
  ];
  const visible = steps.filter((s) => s !== 'addons' || addons.length > 0);
  /* The opening step is guessed at mount, before `addons` is known. If that
     guess is not on the route — a service with no suggestions — fall through
     to the first step that is, instead of rendering an empty offer. */
  const current = visible.includes(step) ? step : (visible[0] ?? 'contacts');
  /* Tied to `step` this was false while the route had already fallen through
     to the time step, so an empty list rendered as "no time available" before
     the fetch had even landed — and it only showed on services with no
     suggestions, where nothing delays the arrival. */
  const loadingSlots = current === 'time' && !fresh;

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
    const i = visible.indexOf(current);
    if (i >= 0 && i < visible.length - 1) setStep(visible[i + 1]!);
  }

  function goBack() {
    const i = visible.indexOf(current);
    if (i > 0) setStep(visible[i - 1]!);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!chosenSlot || selectedIds.length === 0) return;
    setStatus('submitting');
    try {
      const created = await createGuestBooking(org.slug, {
        publishedSlotId: chosenSlot.id,
        serviceIds: selectedIds,
        guestName: name.trim(),
        guestPhone: phone.trim(),
        guestInstagram: instagram.trim() || undefined,
      });
      setReceipt({
        booking: created,
        guestName: name.trim(),
        services: selectedServices.map((service) => ({
          id: service.id,
          name: service.name,
          priceAmountMinorUnits: service.priceAmountMinorUnits,
          priceCurrency: service.priceCurrency,
        })),
        durationMinutes: totals.durationMinutes,
        priceMinorUnits: totals.priceMinorUnits,
        currency: totals.currency,
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

  const awaiting = receipt?.booking.status === 'pending';

  if (status === 'done' && receipt) {
    return (
      <Sheet
        open={open}
        onOpenChange={handleOpenChange}
        title={awaiting ? t.publicPage.requestSent : t.publicPage.bookingConfirmed}
      >
        <div className="flex flex-col items-center gap-4 pb-1 text-center">
          {/* Luxury's ceremony (§7): the gold line draws itself first
              (scaleX, 700ms), the receipt fades in after it — no confetti. */}
          {luxury ? (
            <span aria-hidden="true" className="anim-luxury-line h-px w-16 bg-accent" />
          ) : null}
          <div
            className={cn(
              'flex w-full flex-col items-center gap-4',
              luxury && 'anim-luxury-receipt',
            )}
          >
            {/* Two different facts, and until now both wore the same green tick:
              a booking the master has yet to accept is not the same as one she
              already has. Amber for the wait, green for the answer. */}
            <span
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-full',
                awaiting ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success',
              )}
            >
              {awaiting ? (
                <HourglassMedium size={32} weight="fill" />
              ) : (
                <CheckCircle size={34} weight="fill" />
              )}
            </span>

            <div>
              <p className="font-display text-[24px] leading-tight text-ink">
                {awaiting
                  ? t.publicPage.awaitingConfirmation
                  : `${receipt.guestName}, ${t.publicPage.weAwaitYou}`}
              </p>
              <p className="mt-1.5 text-sm text-ink-soft">
                {fmt(t.publicPage.dateAtTime, {
                  date: FULL_DATE_LABEL.format(new Date(receipt.booking.startsAt)),
                  time: new Intl.DateTimeFormat(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(receipt.booking.startsAt)),
                })}
              </p>
              {awaiting ? (
                <p className="mt-2 text-xs text-ink-soft">{t.publicPage.awaitingHint}</p>
              ) : null}
            </div>

            <div
              className={cn(
                'flex w-full flex-col gap-1.5 px-4 py-3 text-left',
                minimal
                  ? 'rounded-[var(--card-radius)] border border-border'
                  : luxury
                    ? /* The receipt is a card of this world: velvet with the
                       champagne rule (§7). */
                      'rounded-[var(--card-radius)] border border-border-strong bg-bg-raised'
                    : 'rounded-2xl bg-bg-sunken/70',
              )}
            >
              {receipt.services.map((service) => (
                <div key={service.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-ink-soft">{service.name}</span>
                  <span className="shrink-0 text-sm text-ink">
                    {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
                  </span>
                </div>
              ))}
              <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2">
                <span className="text-sm text-ink-soft">
                  {formatDuration(receipt.durationMinutes, t.publicPage)}
                </span>
                <span className="font-display text-lg text-ink">
                  {formatPrice(receipt.priceMinorUnits, receipt.currency)}
                </span>
              </div>
            </div>

            {org.phone ? (
              <p className="text-xs text-ink-soft">
                {t.publicPage.cancelByPhone}{' '}
                <a
                  href={`tel:${org.phone.replace(/\s/g, '')}`}
                  className="font-semibold text-accent"
                >
                  {org.phone}
                </a>
              </p>
            ) : null}

            <BookingFollowup
              slug={org.slug}
              token={receipt.booking.publicToken}
              awaitingConfirmation={Boolean(awaiting)}
              event={{
                title: `${receipt.services.map((service) => service.name).join(', ')} — ${org.name}`,
                startsAt: receipt.booking.startsAt,
                durationMinutes: receipt.durationMinutes,
                location: [org.address, org.city].filter(Boolean).join(', '),
              }}
              className="flex w-full flex-col gap-2"
              buttonClassName={cn(
                'press inline-flex min-h-12 w-full items-center justify-center gap-2 bg-accent text-[15px] font-semibold text-accent-contrast',
                minimal || luxury ? 'rounded-[var(--control-radius)]' : 'rounded-full',
                luxury && LUXURY_BUTTON_CLASS,
              )}
              secondaryClassName={cn(
                'press inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 border border-border-strong text-sm font-semibold text-ink',
                minimal || luxury ? 'rounded-[var(--control-radius)]' : 'rounded-full',
                luxury && LUXURY_BUTTON_CLASS,
              )}
            />

            <Button
              variant="secondary"
              className={cn('w-full', luxury && LUXURY_BUTTON_CLASS)}
              onClick={() => handleOpenChange(false)}
            >
              {t.publicPage.done}
            </Button>
          </div>
        </div>
      </Sheet>
    );
  }

  const canContinue =
    current === 'services' || current === 'addons'
      ? selectedIds.length > 0
      : current === 'time'
        ? Boolean(chosenSlot)
        : name.trim().length >= 2 && phone.trim().length >= 8;

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title={
        current === 'services'
          ? t.publicPage.chooseServices
          : current === 'addons'
            ? t.publicPage.addToBooking
            : current === 'time'
              ? t.publicPage.whenConvenient
              : t.publicPage.yourContacts
      }
      description={
        selectedIds.length > 0
          ? `${formatDuration(totals.durationMinutes, t.publicPage)} · ${formatPrice(totals.priceMinorUnits, totals.currency)}`
          : undefined
      }
      footer={
        <div className="flex gap-2">
          {current !== 'services' ? (
            <Button
              type="button"
              variant="secondary"
              onClick={goBack}
              aria-label={t.common.back}
              className={cn('h-14 w-14 shrink-0', luxury && 'luxury-action')}
            >
              <ArrowLeft size={18} weight="bold" />
            </Button>
          ) : null}

          {current === 'contacts' ? (
            <Button
              type="submit"
              form={formId}
              disabled={!canContinue || status === 'submitting'}
              className={cn('h-14 flex-1 shadow-lifted', luxury && LUXURY_BUTTON_CLASS)}
            >
              {status === 'submitting'
                ? t.publicPage.sending
                : fmt(t.publicPage.bookFor, {
                    price: formatPrice(totals.priceMinorUnits, totals.currency),
                  })}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canContinue}
              className={cn('h-14 flex-1 shadow-lifted', luxury && LUXURY_BUTTON_CLASS)}
            >
              {(() => {
                // The label names where Next actually goes. Tied to the step
                // instead, it promised "Выбрать время" on a route where the
                // time step had already been answered and skipped.
                const next = visible[visible.indexOf(current) + 1];
                if (next === 'time') return t.publicPage.pickTime;
                if (next === 'contacts') return t.publicPage.book;
                return t.common.next;
              })()}
            </Button>
          )}
        </div>
      }
    >
      <StepProgress steps={visible} current={current} minimal={minimal} luxury={luxury} />

      {/* Minimal: the step change is a 120ms crossfade (§6); Luxury slows the
          same change to the cinematic 500ms (§7) — the keyed remount
          retriggers either. */}
      <div
        key={current}
        className={minimal ? 'anim-minimal-crossfade' : luxury ? 'anim-luxury-fade' : undefined}
      >
        {current === 'services' ? (
          <ServicesStep
            org={org}
            selectedIds={selectedIds}
            onToggle={toggleService}
            minimal={minimal}
            luxury={luxury}
          />
        ) : null}

        {current === 'addons' ? (
          <AddonsStep
            addons={addons}
            selectedIds={selectedIds}
            onToggle={toggleService}
            minimal={minimal}
            luxury={luxury}
          />
        ) : null}

        {current === 'time' ? (
          <TimeStep
            days={days}
            loading={loadingSlots}
            activeDate={day?.date ?? null}
            onPickDate={setActiveDate}
            selectedSlotId={effectiveSlotId}
            onPickSlot={setSlotId}
            durationMinutes={totals.durationMinutes}
            minimal={minimal}
            luxury={luxury}
          />
        ) : null}

        {current === 'contacts' ? (
          <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* What is being booked, restated where the visitor commits to it:
              they arrived here from several different routes and may not have
              seen the cart since the first step. */}
            <div
              className={cn(
                'flex flex-col gap-1.5 border border-border px-3.5 py-3',
                (minimal || luxury) && 'rounded-[var(--card-radius)]',
                luxury && 'border-border-strong bg-bg-raised',
              )}
            >
              {selectedServices.map((service) => (
                <div key={service.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[13px] text-ink-soft">{service.name}</span>
                  <span className="shrink-0 text-[13px] text-ink">
                    {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
                  </span>
                </div>
              ))}
              <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-2">
                <span className="text-[13px] font-semibold text-ink">
                  {chosenSlot
                    ? `${FULL_DATE_LABEL.format(new Date(chosenSlot.iso))}, ${chosenSlot.time}`
                    : t.publicPage.timeNotChosen}
                </span>
                <span className="shrink-0 font-display text-[15px] text-ink">
                  {formatPrice(totals.priceMinorUnits, totals.currency)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={nameId} className={labelClass}>
                {t.publicPage.name}
              </label>
              <input
                id={nameId}
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
                placeholder="Katrīna Liepa"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={phoneId} className={labelClass}>
                {t.publicPage.phone}
              </label>
              <input
                id={phoneId}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={cn(inputClass, 'tabular-nums')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={instagramId} className={labelClass}>
                Instagram{' '}
                <span className="font-normal text-ink-faint">— {t.publicPage.optional}</span>
              </label>
              <input
                id={instagramId}
                type="text"
                value={instagram}
                onChange={(event) => setInstagram(event.target.value)}
                className={inputClass}
                placeholder="@username"
              />
            </div>

            {status === 'error' || status === 'blocked' ? (
              <p
                role="alert"
                className={cn(
                  'flex items-start gap-2.5 bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger',
                  /* Minimal's error: a 2px danger rule left of the text (§6). */
                  minimal
                    ? 'rounded-[var(--card-radius)] border-l-2 border-l-danger'
                    : /* Luxury's: the champagne frame and the danger text,
                         arriving on a slow 400ms fade (§7). */
                      luxury
                      ? 'anim-luxury-error rounded-[var(--card-radius)] border border-border-strong bg-transparent'
                      : 'rounded-2xl',
                )}
              >
                <Warning size={17} weight="fill" className="mt-0.5 shrink-0" />
                {status === 'blocked'
                  ? t.publicPage.bookingRefused
                  : conflict || t.publicPage.slotTaken}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>
    </Sheet>
  );
}

interface ApiSlot {
  id: string;
  startsAt: string;
  status: 'available' | 'booked';
}

/** Server order is chronological, so days and their windows come out sorted for free. */
function groupByDay(slots: ApiSlot[], locale: string): SlotDay[] {
  const DAY_LABEL = new Intl.DateTimeFormat(locale, DAY_LABEL_OPTS);
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
