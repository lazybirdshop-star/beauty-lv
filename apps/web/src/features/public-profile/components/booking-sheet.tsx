'use client';

import { ArrowLeft, CheckCircle, HourglassMedium, Warning } from '@phosphor-icons/react';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { BookingFollowup } from './booking-followup';
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

// On `bg`, not `bg-raised`: the placeholder computed to 4.33:1 on the
// raised surface in riga-poster and 4.14 in zalais. A flat field with a
// rule is also the truer object here than a lifted one.
const INPUT_CLASS =
  'h-12 w-full border border-border-strong bg-bg px-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-1 focus:ring-accent';

const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft';

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
function StepProgress({ steps, current }: { steps: BookingStep[]; current: BookingStep }) {
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

/**
 * The poster world's booking sheet: the chrome and the step scenes are its
 * own, the flow underneath is the shared engine's `useBookingFlow` — steps,
 * route, availability race, receipt and statuses live there exactly once.
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
              onClick={actions.goNext}
              disabled={!canContinue}
              className="h-14 flex-1 whitespace-normal rounded-none px-3 text-[13px] uppercase leading-tight tracking-[0.12em]"
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
      <StepProgress steps={route} current={current} />

      {current === 'services' ? (
        <ServicesStep org={org} selectedIds={selectedIds} onToggle={actions.toggleService} />
      ) : null}

      {current === 'addons' ? (
        <AddonsStep addons={addons} selectedIds={selectedIds} onToggle={actions.toggleService} />
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
              value={guest.name}
              onChange={(event) => actions.setGuestName(event.target.value)}
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
              value={guest.phone}
              onChange={(event) => actions.setGuestPhone(event.target.value)}
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
              value={guest.instagram}
              onChange={(event) => actions.setGuestInstagram(event.target.value)}
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
