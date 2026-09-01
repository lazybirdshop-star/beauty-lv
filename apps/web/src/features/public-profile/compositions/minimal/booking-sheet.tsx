'use client';

import { ArrowLeft, Check } from '@phosphor-icons/react';
import { useId } from 'react';

import { formatCivilDay, formatDuration, formatPrice } from '@/lib/format';
import { useLocale, useT, type Messages } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

import type { BookingSheetProps } from '../../contracts/booking';
import {
  useBookingFlow,
  type BookingStep,
  type UseBookingFlowArgs,
} from '../../engine/use-booking-flow';
import { BookingContactsStep, submitBookingForm } from '../../shared/booking-contacts-step';
import { AwaitingNote } from '../../shared/awaiting-note';
import { BookingFollowup } from '../../shared/booking-followup';
import { SheetBase } from '../../shared/sheet-base';

import { AddonsStep, ServicesStep, TimeStep } from './booking-steps';
import { sheetChrome } from './chrome';
import { FOCUS_RING, LABEL_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from './ui';

/* Поле ввода — капсула подложки без края; кегль 16px, чтобы iOS не зумил
   форму при фокусе. */
const INPUT_CLASS =
  'h-12 w-full rounded-[var(--control-radius)] bg-bg-sunken px-4 text-base text-ink outline-none placeholder:text-ink-soft focus:ring-2 focus:ring-accent';

function stepLabel(step: BookingStep, t: Messages): string {
  switch (step) {
    case 'services':
      return t.publicPage.stepService;
    case 'addons':
      return t.publicPage.stepAddons;
    case 'time':
      return t.publicPage.stepTime;
    case 'contacts':
      return t.publicPage.stepDetails;
  }
}

/**
 * Строка выбранного времени — `.sheet-dt` файла: белая карточка, время
 * полужирным, рядом синяя текстовая кнопка возврата.
 *
 * Полосы прогресса здесь нет и не будет: в файле шторка это одна плита
 * «вот твоя запись», а сегментированный индикатор превратил бы её в мастер
 * настройки.
 */
function ChosenTime({
  label,
  onChange,
  changeLabel,
}: {
  label: string;
  onChange?: () => void;
  changeLabel: string;
}) {
  return (
    <div className="min-card flex items-center justify-between gap-3 rounded-[18px] px-[18px] py-4">
      <b className="min-w-0 truncate text-[15px] font-bold tracking-[-0.02em] text-ink">{label}</b>
      {onChange ? (
        <button
          type="button"
          onClick={onChange}
          className={cn(
            'min-press shrink-0 cursor-pointer rounded-full px-1 text-[13.5px] font-semibold text-accent',
            FOCUS_RING,
          )}
        >
          {changeLabel}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Шторка записи мира MINIMAL (`minimal.html`): лист земли, встающий в
 * нижнюю кромку, с брусочком-ручкой наверху.
 *
 * Успех — зелёный круг с галочкой (`.ok-circle` файла). Статусные цвета
 * неприкосновенны в любом мире: «ждёт подтверждения» остаётся янтарным,
 * «подтверждена» — зелёным, и круг красится `--success`, а не акцентом.
 */
export function BookingSheet({ flow, org, chrome }: BookingSheetProps) {
  const t = useT();
  const locale = useLocale();
  const formId = useId();

  const { state, derived, actions } = flow;
  const { step: current, status, receipt } = state;
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

  /* Подпись выбранного окна собирается из того, что уже отдаёт движок:
     заводить ради неё поле в контракте не нужно (правило роста §7.7). */
  const chosen = effectiveSlotId
    ? days
        .flatMap((day) => day.slots.map((slot) => ({ day, slot })))
        .find((pair) => pair.slot.id === effectiveSlotId)
    : undefined;
  const chosenTimeLabel = chosen ? `${chosen.day.label} · ${chosen.slot.time}` : null;

  function handleOpenChange(next: boolean) {
    if (!next) actions.close();
  }

  if (status === 'done' && receipt) {
    /* Час визита нужен дважды — подписью экрана и подписью сообщения,
       которое человек отправляет себе, — и обе обязаны читаться
       одинаково. */
    const when = fmt(t.publicPage.dateAtTime, {
      /* Из расписки, а не из момента: час визита принадлежит
                   поясу салона, и `Intl` в браузере клиента перевёл бы его
                   в чужой. */
      date: formatCivilDay(receipt.date, locale),
      time: receipt.time,
    });

    return (
      <SheetBase
        open={state.open}
        onOpenChange={handleOpenChange}
        title={awaiting ? t.publicPage.requestSent : t.publicPage.bookingConfirmed}
        chrome={chrome}
      >
        <div className="anim-minimal-rise flex flex-col gap-5 pb-1 text-center">
          <div>
            <span
              aria-hidden="true"
              className="mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-full bg-success text-bg-raised shadow-[0_18px_36px_-12px_color-mix(in_srgb,var(--success)_50%,transparent)]"
            >
              <Check size={32} weight="bold" />
            </span>

            <p
              className={cn(
                'mt-4 text-[12.5px] font-semibold tracking-[-0.01em]',
                awaiting ? 'text-warning' : 'text-success',
              )}
            >
              {awaiting ? t.publicPage.statusPending : t.publicPage.statusConfirmed}
            </p>

            <p className="mt-2 font-display text-[26px] font-bold tracking-[-0.035em] text-ink">
              {awaiting
                ? t.publicPage.awaitingConfirmation
                : `${receipt.guestName}, ${t.publicPage.weAwaitYou}`}
            </p>

            <p className="mt-2 text-[14.5px] leading-[1.6] tracking-[-0.01em] tabular-nums text-ink-soft">
              {when}
            </p>
            {awaiting ? (
              <AwaitingNote email={receipt.guestEmail} className="mt-2 text-[13px] text-ink-soft" />
            ) : null}
          </div>

          <div className="min-card flex w-full flex-col gap-2 px-[18px] py-4 text-left">
            {receipt.services.map((service) => (
              <div key={service.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-[13px] text-ink-soft">{service.name}</span>
                <span className="shrink-0 text-[13px] tabular-nums text-ink">
                  {formatPrice(service.priceAmountMinorUnits, service.priceCurrency, locale)}
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="text-[13px] text-ink-soft">
                {formatDuration(receipt.durationMinutes, t.common)}
              </span>
              <span className="text-[15px] font-bold tracking-[-0.02em] tabular-nums text-ink">
                {formatPrice(receipt.priceMinorUnits, receipt.currency, locale)}
              </span>
            </div>
          </div>

          {org.phone ? (
            <p className="text-[13px] text-ink-soft">
              {t.publicPage.cancelByPhone}{' '}
              <a
                href={`tel:${org.phone.replace(/\s/g, '')}`}
                className={cn('font-semibold text-accent', FOCUS_RING)}
              >
                {org.phone}
              </a>
            </p>
          ) : null}

          <BookingFollowup
            slug={org.slug}
            token={receipt.booking.publicToken}
            awaitingConfirmation={Boolean(awaiting)}
            masterName={org.name}
            when={when}
            event={{
              title: `${receipt.services.map((service) => service.name).join(', ')} — ${org.name}`,
              startsAt: receipt.booking.startsAt,
              durationMinutes: receipt.durationMinutes,
              location: [org.address, org.city].filter(Boolean).join(', '),
            }}
            className="flex w-full flex-col gap-2.5"
            buttonClassName={cn(PRIMARY_BUTTON_CLASS, 'w-full')}
            secondaryClassName={cn(SECONDARY_BUTTON_CLASS, 'min-h-[52px] w-full')}
          />

          <button
            type="button"
            className={cn(SECONDARY_BUTTON_CLASS, 'h-[52px] w-full')}
            onClick={() => handleOpenChange(false)}
          >
            {t.publicPage.done}
          </button>
        </div>
      </SheetBase>
    );
  }

  const submitting = status === 'submitting';

  return (
    <SheetBase
      open={state.open}
      onOpenChange={handleOpenChange}
      chrome={chrome}
      title={t.publicPage.yourBooking}
      description={
        selectedIds.length > 0
          ? `${formatDuration(totals.durationMinutes, t.common)} · ${formatPrice(totals.priceMinorUnits, totals.currency, locale)}`
          : undefined
      }
      footer={
        <div className="flex gap-2.5">
          {current !== 'services' ? (
            <button
              type="button"
              onClick={actions.goBack}
              aria-label={t.common.back}
              className={cn(SECONDARY_BUTTON_CLASS, 'h-[54px] w-[54px] shrink-0 px-0')}
            >
              <ArrowLeft size={18} weight="bold" />
            </button>
          ) : null}

          {current === 'contacts' ? (
            <button
              /* Кнопка подвала одна на все шаги: нативная отправка успевала
                 сработать тем же нажатием, которым человек только пришёл на
                 этот шаг. Поэтому форму просим отправиться сами. */
              type="button"
              onClick={() => submitBookingForm(formId)}
              disabled={!canContinue || submitting}
              className={cn(PRIMARY_BUTTON_CLASS, 'flex-1')}
            >
              {submitting
                ? t.publicPage.sending
                : fmt(t.publicPage.bookFor, {
                    price: formatPrice(totals.priceMinorUnits, totals.currency, locale),
                  })}
            </button>
          ) : (
            <button
              type="button"
              onClick={actions.goNext}
              disabled={!canContinue}
              className={cn(PRIMARY_BUTTON_CLASS, 'flex-1')}
            >
              {(() => {
                if (nextStep === 'time') return t.publicPage.pickTime;
                if (nextStep === 'contacts') return t.publicPage.book;
                return t.common.next;
              })()}
            </button>
          )}
        </div>
      }
    >
      {chosenTimeLabel ? (
        <div className="mb-5 flex flex-col gap-2.5">
          <p className={LABEL_CLASS}>{t.publicPage.stepTime}</p>
          <ChosenTime
            label={chosenTimeLabel}
            changeLabel={t.common.back}
            onChange={current === 'contacts' ? actions.goBack : undefined}
          />
        </div>
      ) : null}

      <p className={cn('mb-2.5', LABEL_CLASS)}>{stepLabel(current, t)}</p>

      <div key={current} className="anim-minimal-rise">
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
          /* Сцена контактов — единственная общая часть записи (§7.6): поля,
             валидация и озвучивание ошибок принадлежат продукту. */
          <BookingContactsStep
            flow={flow}
            formId={formId}
            classes={{
              summary: 'min-card flex flex-col gap-2 px-[18px] py-4',
              label: LABEL_CLASS,
              input: INPUT_CLASS,
              error:
                'anim-minimal-rise rounded-[var(--card-radius)] bg-danger-soft px-4 py-3 text-danger',
            }}
          />
        ) : null}
      </div>
    </SheetBase>
  );
}

/** Хук-хост шторки (§7.2): создаёт flow движка и передаёт его шторке мира. */
export function BookingFlowSheet(args: UseBookingFlowArgs) {
  const flow = useBookingFlow(args);
  return <BookingSheet flow={flow} org={args.org} chrome={sheetChrome} />;
}
