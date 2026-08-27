'use client';

import { ArrowLeft, CheckCircle, HourglassMedium } from '@phosphor-icons/react';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { BookingContactsStep, submitBookingForm } from '../../shared/booking-contacts-step';
import { BookingFollowup } from '../../shared/booking-followup';
import { SheetBase } from '../../shared/sheet-base';
import { formatCivilDay, formatDuration, formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import {
  useBookingFlow,
  type BookingStep,
  type UseBookingFlowArgs,
} from '../../engine/use-booking-flow';
import type { BookingSheetProps } from '../../contracts/booking';
import { AddonsStep, ServicesStep, TimeStep } from './booking-steps';
import { sheetChrome } from './chrome';

// On `bg`, not `bg-raised`: the placeholder computed to 4.33:1 on the
// raised surface in riga-poster and 4.14 in zalais. A flat field with a
// rule is also the truer object here than a lifted one.
const INPUT_CLASS =
  'h-12 w-full border border-border-strong bg-bg px-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-1 focus:ring-accent';

const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft';

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
export function BookingSheet({ flow, org, chrome }: BookingSheetProps) {
  const t = useT();
  const locale = useLocale();
  const formId = useId();

  const { state, derived, actions } = flow;
  const { step: current, route, status, receipt } = state;
  const {
    addons,
    totals,
    days,
    activeDay,
    loadingSlots,
    effectiveSlotId,
    canContinue,
    awaiting,
    nextStep,
  } = derived;
  const selectedIds = state.selectedIds;

  function handleOpenChange(next: boolean) {
    /* Открытие приходит только снаружи (календарь, карточка услуги) — у
       Dialog здесь нет своего триггера, поэтому Radix сообщает лишь о
       закрытии (ESC, оверлей). */
    if (!next) actions.close();
  }

  if (status === 'done' && receipt) {
    return (
      <SheetBase
        open={state.open}
        onOpenChange={handleOpenChange}
        title={awaiting ? t.publicPage.requestSent : t.publicPage.bookingConfirmed}
        chrome={chrome}
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
                /* Из расписки, а не из момента: час визита принадлежит
                   поясу салона, и `Intl` в браузере клиента перевёл бы его
                   в чужой. */
                date: formatCivilDay(receipt.date, locale),
                time: receipt.time,
              })}
            </p>
          </div>

          <div className="flex w-full flex-col gap-1.5 border border-border px-4 py-3 text-left">
            {receipt.services.map((service) => (
              <div key={service.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-ink-soft">{service.name}</span>
                <span className="shrink-0 text-sm text-ink">
                  {formatPrice(service.priceAmountMinorUnits, service.priceCurrency, locale)}
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2">
              <span className="text-sm text-ink-soft">
                {formatDuration(receipt.durationMinutes, t.common)}
              </span>
              <span className="font-display text-lg text-ink">
                {formatPrice(receipt.priceMinorUnits, receipt.currency, locale)}
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
            buttonClassName="action-fill press inline-flex min-h-12 w-full items-center justify-center gap-2 text-[15px] font-semibold uppercase tracking-[0.04em]"
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
      </SheetBase>
    );
  }

  return (
    <SheetBase
      open={state.open}
      onOpenChange={handleOpenChange}
      chrome={chrome}
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
          ? `${formatDuration(totals.durationMinutes, t.common)} · ${formatPrice(totals.priceMinorUnits, totals.currency, locale)}`
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
              /* Кнопка подвала одна на все шаги: нативная отправка успевала
                 сработать тем же нажатием, которым человек только пришёл на
                 этот шаг. Поэтому форму просим отправиться сами. */
              type="button"
              onClick={() => submitBookingForm(formId)}
              disabled={!canContinue || status === 'submitting'}
              className="h-14 flex-1 whitespace-normal rounded-none px-3 text-[13px] uppercase leading-tight tracking-[0.12em]"
            >
              {status === 'submitting'
                ? t.publicPage.sending
                : fmt(t.publicPage.bookFor, {
                    price: formatPrice(totals.priceMinorUnits, totals.currency, locale),
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
        /* The contacts scene is the one piece of booking DOM the worlds
           share (§7.6): fields, validation and the error announcement are
           the product's own; this world only dresses them. */
        <BookingContactsStep
          flow={flow}
          formId={formId}
          classes={{
            summary: 'flex flex-col gap-1.5 border border-border px-3.5 py-3',
            label: LABEL_CLASS,
            input: INPUT_CLASS,
            error: 'border border-danger text-danger',
          }}
        />
      ) : null}
    </SheetBase>
  );
}

/**
 * Хук-хост шторки (§7.2): создаёт flow движка и передаёт его контрактной
 * шторке мира. Секции вызывают его с теми же аргументами, что принимал
 * прежний BookingSheet; `key` на стороне вызова по-прежнему даёт свежий
 * flow на субъекта (карточка услуги в прайсе).
 */
export function BookingFlowSheet(args: UseBookingFlowArgs) {
  const flow = useBookingFlow(args);
  return <BookingSheet flow={flow} org={args.org} chrome={sheetChrome} />;
}
