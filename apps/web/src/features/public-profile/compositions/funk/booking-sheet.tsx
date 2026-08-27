'use client';

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
import { BookingFollowup } from '../../shared/booking-followup';
import { SheetBase } from '../../shared/sheet-base';

import { AddonsStep, ServicesStep, TimeStep } from './booking-steps';
import { sheetChrome } from './chrome';
import { FOCUS_RING, LABEL_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from './ui';

/* Поле ввода — блок с контуром; кегль 16px, чтобы iOS не зумил форму. */
const INPUT_CLASS =
  'funk-block h-12 w-full px-3.5 font-mono text-base text-ink outline-none placeholder:text-ink-faint focus:shadow-[3px_3px_0_var(--accent-to,var(--accent))]';

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
 * Строка выбранного времени — `.sheet-dt` файла: белый блок, время
 * дисплейным капсом, рядом лаймовая кнопка возврата.
 *
 * Полосы прогресса здесь нет и не будет: в файле шторка это одна плита
 * «вот твоя запись», а сегментированный индикатор превратил бы её в мастер
 * настройки. Где человек находится, говорит чернильная полоса заголовка.
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
    <div className="funk-block flex items-center justify-between gap-3 px-[15px] py-3.5">
      <b className="min-w-0 truncate font-display text-sm font-extrabold uppercase tracking-[-0.01em] text-ink">
        {label}
      </b>
      {onChange ? (
        <button
          type="button"
          onClick={onChange}
          className={cn(
            'funk-press shrink-0 cursor-pointer border-2 border-solid border-ink bg-accent px-2.5 py-[7px] font-mono text-[9.5px] font-bold uppercase text-ink shadow-[2px_2px_0_var(--ink)]',
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
 * Шторка записи мира FUNK (`brutal.html`): лист земли с контуром, наверху —
 * чернильная полоса с заголовком и розовой кнопкой закрытия.
 *
 * Успех — лаймовый штамп под углом (`.ok-stamp` файла): мир подтверждает
 * печатью, а не галочкой. Статусные цвета при этом неприкосновенны в любом
 * мире: «ждёт подтверждения» остаётся янтарным, «подтверждена» — зелёным.
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
    return (
      <SheetBase
        open={state.open}
        onOpenChange={handleOpenChange}
        title={awaiting ? t.publicPage.requestSent : t.publicPage.bookingConfirmed}
        chrome={chrome}
      >
        <div className="anim-funk-pop flex flex-col gap-5 pb-1 text-center">
          <div>
            <span
              aria-hidden="true"
              className="funk-block mx-auto flex h-24 w-24 -rotate-6 items-center justify-center bg-accent font-display text-[40px] font-black text-ink"
            >
              OK
            </span>

            <p
              className={cn(
                'mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em]',
                awaiting ? 'text-warning' : 'text-success',
              )}
            >
              {awaiting ? t.publicPage.statusPending : t.publicPage.statusConfirmed}
            </p>

            <p className="mt-3 font-display text-[26px] font-black uppercase tracking-[-0.02em] text-ink">
              {awaiting
                ? t.publicPage.awaitingConfirmation
                : `${receipt.guestName}, ${t.publicPage.weAwaitYou}`}
            </p>

            <p className="mt-2.5 font-mono text-[11.5px] leading-[1.9] tabular-nums text-ink-soft">
              {fmt(t.publicPage.dateAtTime, {
                /* Из расписки, а не из момента: час визита принадлежит
                   поясу салона, и `Intl` в браузере клиента перевёл бы его
                   в чужой. */
                date: formatCivilDay(receipt.date, locale),
                time: receipt.time,
              })}
            </p>
            {awaiting ? (
              <p className="mt-2 font-mono text-[10px] text-ink-soft">
                {t.publicPage.awaitingHint}
              </p>
            ) : null}
          </div>

          <div className="funk-block flex w-full flex-col gap-2 px-[15px] py-4 text-left">
            {receipt.services.map((service) => (
              <div key={service.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-mono text-[11.5px] text-ink-soft">
                  {service.name}
                </span>
                <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-ink">
                  {formatPrice(service.priceAmountMinorUnits, service.priceCurrency, locale)}
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between gap-3 border-t-2 border-dashed border-ink pt-3">
              <span className="font-mono text-[11.5px] text-ink-soft">
                {formatDuration(receipt.durationMinutes, t.common)}
              </span>
              <span className="bg-ink px-2.5 py-1.5 font-mono text-[13px] font-bold tabular-nums text-accent">
                {formatPrice(receipt.priceMinorUnits, receipt.currency, locale)}
              </span>
            </div>
          </div>

          {org.phone ? (
            <p className="font-mono text-[10px] text-ink-soft">
              {t.publicPage.cancelByPhone}{' '}
              <a
                href={`tel:${org.phone.replace(/\s/g, '')}`}
                className={cn('font-bold text-ink underline decoration-2', FOCUS_RING)}
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
            className="flex w-full flex-col gap-2.5"
            buttonClassName={cn(PRIMARY_BUTTON_CLASS, 'min-h-14 w-full')}
            secondaryClassName={cn(SECONDARY_BUTTON_CLASS, 'min-h-[54px] w-full')}
          />

          <button
            type="button"
            className={cn(SECONDARY_BUTTON_CLASS, 'h-[54px] w-full')}
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
      title={`${t.publicPage.yourBooking} // ${org.name}`}
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
              className={cn(SECONDARY_BUTTON_CLASS, 'h-14 w-14 shrink-0 text-lg')}
            >
              <span aria-hidden="true">←</span>
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
          <p className={LABEL_CLASS}>{`// ${t.publicPage.stepTime}`}</p>
          <ChosenTime
            label={chosenTimeLabel}
            changeLabel={t.common.back}
            onChange={current === 'contacts' ? actions.goBack : undefined}
          />
        </div>
      ) : null}

      <p className={cn('mb-2.5', LABEL_CLASS)}>{`// ${stepLabel(current, t)}`}</p>

      <div key={current} className="anim-funk-pop">
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
              summary: 'funk-block flex flex-col gap-2 px-[15px] py-4',
              label: LABEL_CLASS,
              input: INPUT_CLASS,
              error:
                'anim-funk-pop border-[length:var(--rule-width)] border-solid border-danger bg-danger-soft text-danger',
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
