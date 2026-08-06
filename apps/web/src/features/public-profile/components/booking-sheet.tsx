'use client';

import { ArrowLeft, CheckCircle, HourglassMedium, Warning } from '@phosphor-icons/react';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { BookingFollowup } from './booking-followup';
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

// On `bg`, not `bg-raised`: the placeholder computed to 4.33:1 on the
// raised surface in riga-poster and 4.14 in zalais. A flat field with a
// rule is also the truer object here than a lifted one.
const INPUT_CLASS =
  'h-12 w-full border border-border-strong bg-bg px-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-1 focus:ring-accent';

const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft';

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
function StepProgress({ steps, current }: { steps: Step[]; current: Step }) {
  const index = steps.indexOf(current);
  return (
    <div aria-hidden="true" className="mb-4 flex gap-1.5">
      {steps.map((step, position) => (
        <span
          key={step}
          className={cn(
            'h-0.5 flex-1 transition-colors',
            position <= index ? 'bg-accent' : 'bg-bg-sunken',
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
  // Four segments always. Deriving the route from `addons` meant the bar
  // showed three segments on step one and grew a fourth the moment a service
  // with suggestions was picked — a route indicator that lies about the route.
  // The suggestions step is skipped in navigation, not erased from the count.
  /*
   * The route depends on where the visitor came in: from a service card the
   * services step is already answered, from a window in the calendar the time
   * step is. Nobody is asked twice for what they already chose.
   *
   * Time returns to the route even on the calendar path once the chosen window
   * can no longer hold the cart — telling someone at the contacts step that
   * their time stopped working is worse than asking again.
   */
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
  /* Navigation walks that route rather than a fixed ladder, so a skipped step
     cannot be reached by pressing Next twice. */
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
          {/* Flat field, no soft ring — the poster world says it with colour
              and a square, not with a tinted pill. Amber while the master has
              not answered, green once she has. */}
          <span
            className={cn(
              'flex h-16 w-16 items-center justify-center text-bg',
              awaiting ? 'bg-warning' : 'bg-success',
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
          </div>

          <div className="flex w-full flex-col gap-1.5 border border-border px-4 py-3 text-left">
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
              <a href={`tel:${org.phone.replace(/\s/g, '')}`} className="font-semibold text-accent">
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
            buttonClassName="press inline-flex min-h-12 w-full items-center justify-center gap-2 bg-accent text-[15px] font-semibold uppercase tracking-[0.04em] text-accent-contrast"
            secondaryClassName="press inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 border border-border-strong text-sm font-semibold text-ink"
          />

          <Button
            variant="secondary"
            className="w-full rounded-none"
            onClick={() => handleOpenChange(false)}
          >
            {t.publicPage.done}
          </Button>
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
              className="h-14 w-14 shrink-0 rounded-none"
            >
              <ArrowLeft size={18} weight="bold" />
            </Button>
          ) : null}

          {current === 'contacts' ? (
            <Button
              type="submit"
              form={formId}
              disabled={!canContinue || status === 'submitting'}
              className="h-14 flex-1 whitespace-normal rounded-none px-3 text-[13px] uppercase leading-tight tracking-[0.12em]"
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
              className="h-14 flex-1 whitespace-normal rounded-none px-3 text-[13px] uppercase leading-tight tracking-[0.12em]"
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
      <StepProgress steps={visible} current={current} />

      {current === 'services' ? (
        <ServicesStep org={org} selectedIds={selectedIds} onToggle={toggleService} />
      ) : null}

      {current === 'addons' ? (
        <AddonsStep addons={addons} selectedIds={selectedIds} onToggle={toggleService} />
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
        />
      ) : null}

      {current === 'contacts' ? (
        <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* What is being booked, restated where the visitor commits to it:
              they arrived here from several different routes and may not have
              seen the cart since the first step. */}
          <div className="flex flex-col gap-1.5 border border-border px-3.5 py-3">
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
            <label htmlFor={nameId} className={LABEL_CLASS}>
              {t.publicPage.name}
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
              className={cn(INPUT_CLASS, 'tabular-nums')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={instagramId} className={LABEL_CLASS}>
              Instagram{' '}
              <span className="font-normal text-ink-faint">— {t.publicPage.optional}</span>
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
              className="flex items-start gap-2.5 border border-danger px-3.5 py-2.5 text-[13px] text-danger"
            >
              <Warning size={17} weight="fill" className="mt-0.5 shrink-0" />
              {status === 'blocked'
                ? t.publicPage.bookingRefused
                : conflict || t.publicPage.slotTaken}
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
