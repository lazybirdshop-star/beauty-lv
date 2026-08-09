'use client';

import { ArrowLeft, CheckCircle, HourglassMedium, Warning } from '@phosphor-icons/react';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { BookingFollowup } from '../components/booking-followup';
import { Sheet } from '@/components/ui/sheet';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { fmt, useLocale, useT } from '@/lib/i18n';

import { formatDuration } from '../engine/booking-cart';
import { useBookingFlow, type BookingStep } from '../engine/use-booking-flow';
import { AddonsStep, ServicesStep, TimeStep } from './booking-steps';
import type { PublicOrganization, PublishedSlot } from '../engine/types';

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

const FULL_DATE_LABEL_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
};

/**
 * Progress for the flow's route, as segments rather than "шаг 2 из 4": the
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
  steps: BookingStep[];
  current: BookingStep;
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

/**
 * The soft world's booking sheet: the chrome and the step scenes are its own
 * (with the Minimal and Luxury token-branches intact), the flow underneath is
 * the shared engine's `useBookingFlow` — steps, route, availability race,
 * receipt and statuses live there exactly once.
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

  /* The Minimal world (§6): hairline materials, 8px fields, 2px progress
     rules, steps changing in a 120ms crossfade. */
  const minimal = org.designPresetKey === 'minimal';
  /* The Luxury world (§7): fields recessed in velvet, caps labels, 1px
     progress hairlines drawn in gold, steps in a slow 500ms fade. */
  const luxury = org.designPresetKey === 'luxury';
  const labelClass = minimal ? MINIMAL_LABEL_CLASS : luxury ? LUXURY_LABEL_CLASS : LABEL_CLASS;
  const inputClass = luxury ? LUXURY_INPUT_CLASS : INPUT_CLASS;

  const flow = useBookingFlow({
    open,
    onOpenChange,
    org,
    preferredSlot,
    initialServiceIds,
    slotChosen,
    onBooked,
  });
  const { state, derived, actions } = flow;
  const { step: current, route, status, conflict, guest, receipt } = state;
  const {
    selectedServices,
    addons,
    totals,
    days,
    activeDay,
    loadingSlots,
    chosenSlot,
    effectiveSlotId,
    canContinue,
    awaiting,
    nextStep,
  } = derived;
  const selectedIds = state.selectedIds;

  function handleOpenChange(next: boolean) {
    if (next) onOpenChange(next);
    else actions.close();
  }

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
              onClick={actions.goBack}
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
              onClick={actions.goNext}
              disabled={!canContinue}
              className={cn('h-14 flex-1 shadow-lifted', luxury && LUXURY_BUTTON_CLASS)}
            >
              {(() => {
                // The label names where Next actually goes. Tied to the step
                // instead, it promised "Выбрать время" on a route where the
                // time step had already been answered and skipped.
                if (nextStep === 'time') return t.publicPage.pickTime;
                if (nextStep === 'contacts') return t.publicPage.book;
                return t.common.next;
              })()}
            </Button>
          )}
        </div>
      }
    >
      <StepProgress steps={route} current={current} minimal={minimal} luxury={luxury} />

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
            onToggle={actions.toggleService}
            minimal={minimal}
            luxury={luxury}
          />
        ) : null}

        {current === 'addons' ? (
          <AddonsStep
            addons={addons}
            selectedIds={selectedIds}
            onToggle={actions.toggleService}
            minimal={minimal}
            luxury={luxury}
          />
        ) : null}

        {current === 'time' ? (
          <TimeStep
            days={days}
            loading={loadingSlots}
            activeDate={activeDay?.date ?? null}
            onPickDate={actions.pickDate}
            selectedSlotId={effectiveSlotId}
            onPickSlot={actions.pickSlot}
            durationMinutes={totals.durationMinutes}
            minimal={minimal}
            luxury={luxury}
          />
        ) : null}

        {current === 'contacts' ? (
          <form
            id={formId}
            onSubmit={(event) => {
              event.preventDefault();
              void actions.submit();
            }}
            className="flex flex-col gap-3.5"
          >
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
                value={guest.name}
                onChange={(event) => actions.setGuestName(event.target.value)}
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
                value={guest.phone}
                onChange={(event) => actions.setGuestPhone(event.target.value)}
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
                value={guest.instagram}
                onChange={(event) => actions.setGuestInstagram(event.target.value)}
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
