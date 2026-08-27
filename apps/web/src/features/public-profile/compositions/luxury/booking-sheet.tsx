'use client';

import { ArrowLeft } from '@phosphor-icons/react';
import { useId } from 'react';

import { BookingContactsStep, submitBookingForm } from '../../shared/booking-contacts-step';
import { BookingFollowup } from '../../shared/booking-followup';
import { SheetBase } from '../../shared/sheet-base';
import { formatCivilDay, formatDuration, formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useLocale, useT, type Messages } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import {
  useBookingFlow,
  type BookingStep,
  type UseBookingFlowArgs,
} from '../../engine/use-booking-flow';
import type { BookingSheetProps } from '../../contracts/booking';
import { AddonsStep, ServicesStep, TimeStep } from './booking-steps';
import { sheetChrome } from './chrome';
import { CAPTION_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from './ui';

/* Поле мира — печатный прямоугольник: сливочная подложка `bg-raised` в
   тихой линейке, фокус — бронзовый край с кольцом за 200ms. Кегль 16px. */
const INPUT_CLASS =
  'h-12 w-full border border-border bg-bg-raised px-3.5 text-base text-ink outline-none transition-[border-color,box-shadow] duration-200 ease-[var(--ease-style)] placeholder:text-ink-faint focus:border-accent focus:ring-1 focus:ring-accent';

/* Лейблы — капс 10px с разрядкой 0.2em: служебный слой разворота. */
const LABEL_CLASS = CAPTION_CLASS;

/* Подписи шагов для чипов маршрута — по одному слову на шаг. */
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
 * Маршрут записи — чипы «1 · УСЛУГА» макета: капс 10px с разрядкой 0.14em.
 * Текущий шаг залит бронзой, пройденные несут чернильный контур, будущие —
 * тихую линейку с блёклой надписью. Чипы декоративны (позицию озвучивает
 * заголовок шторки), поэтому скрыты от читалок.
 */
function StepChips({ steps, current }: { steps: BookingStep[]; current: BookingStep }) {
  const t = useT();
  const index = steps.indexOf(current);
  return (
    <div aria-hidden="true" className="mb-4 flex flex-wrap gap-2">
      {steps.map((step, position) => (
        <span
          key={step}
          className={cn(
            'px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em]',
            position === index
              ? 'bg-accent text-accent-contrast'
              : position < index
                ? 'border border-border-strong text-ink'
                : 'border border-border text-ink-faint',
          )}
        >
          {position + 1} · {stepLabel(step, t)}
        </span>
      ))}
    </div>
  );
}

/**
 * Шторка записи мира Luxury («Bergs»): печатный лист снизу — хром задаёт
 * `chrome.tsx` (чернильный шов 2px, тихая ручка 40×3, прямые углы), сцены
 * шагов — собственные; машина состояний — общая (`useBookingFlow`, контракт
 * §7.3). Шаги сменяются медленным fade 500ms, keyed-ремонт перезапускает
 * его. Success — церемония: сначала дорисовывается бронзовая линейка
 * (scaleX 0 → 1, 700ms), затем квитанция проявляется за 500ms; статус —
 * капс 11px без подложки с линейками над и под, статусные цвета
 * неприкосновенны в любом мире.
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
        <div className="flex flex-col gap-5 pb-1">
          {/* Церемония: линейка дорисовывается первой, затем проявляется
              квитанция. */}
          <span aria-hidden="true" className="anim-luxury-line h-px w-16 bg-accent" />

          <div className="anim-luxury-receipt flex flex-col gap-5">
            {/* Два разных факта — два статусных цвета: янтарь ожидания и
                зелень ответа. Бейдж мира: капс 11px без подложки, линейка
                над и под. */}
            <div>
              <span
                className={cn(
                  'inline-block border-y border-current/40 px-1 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]',
                  awaiting ? 'text-warning' : 'text-success',
                )}
              >
                {awaiting ? t.publicPage.statusPending : t.publicPage.statusConfirmed}
              </span>
              <p className="mt-3 font-display text-[24px] leading-tight [font-weight:var(--display-weight)] text-ink">
                {awaiting
                  ? t.publicPage.awaitingConfirmation
                  : `${receipt.guestName}, ${t.publicPage.weAwaitYou}`}
              </p>
              <p className="mt-1.5 text-sm tabular-nums text-ink-soft">
                {fmt(t.publicPage.dateAtTime, {
                  /* Из расписки, а не из момента: час визита принадлежит
                     поясу салона, и `Intl` в браузере клиента перевёл бы его
                     в чужой. */
                  date: formatCivilDay(receipt.date, locale),
                  time: receipt.time,
                })}
              </p>
              {awaiting ? (
                <p className="mt-2 text-xs text-ink-soft">{t.publicPage.awaitingHint}</p>
              ) : null}
            </div>

            {/* Квитанция — печатный блок в чернильной линейке; строки делят
                тихие линейки. */}
            <div className="flex w-full flex-col gap-1.5 border border-border-strong px-4 py-3.5 text-left">
              {receipt.services.map((service) => (
                <div key={service.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-ink-soft">{service.name}</span>
                  <span className="shrink-0 text-sm tabular-nums text-ink">
                    {formatPrice(service.priceAmountMinorUnits, service.priceCurrency, locale)}
                  </span>
                </div>
              ))}
              <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2.5">
                <span className="text-sm text-ink-soft">
                  {formatDuration(receipt.durationMinutes, t.common)}
                </span>
                <span className="font-display text-[22px] tabular-nums [font-weight:var(--display-weight)] text-ink">
                  {formatPrice(receipt.priceMinorUnits, receipt.currency, locale)}
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
              buttonClassName={cn(PRIMARY_BUTTON_CLASS, 'min-h-12 w-full')}
              secondaryClassName={cn(SECONDARY_BUTTON_CLASS, 'min-h-11 w-full text-[10px]')}
            />

            <button
              type="button"
              className={cn(SECONDARY_BUTTON_CLASS, 'h-12 w-full')}
              onClick={() => handleOpenChange(false)}
            >
              {t.publicPage.done}
            </button>
          </div>
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
            <button
              type="button"
              onClick={actions.goBack}
              aria-label={t.common.back}
              className={cn(SECONDARY_BUTTON_CLASS, 'h-[54px] w-[54px] shrink-0')}
            >
              <ArrowLeft size={18} weight="regular" />
            </button>
          ) : null}

          {current === 'contacts' ? (
            <button
              /* Кнопка подвала одна на все шаги: нативная отправка успевала
                 сработать тем же нажатием, которым человек только пришёл на
                 этот шаг. Поэтому форму просим отправиться сами. */
              type="button"
              onClick={() => submitBookingForm(formId)}
              disabled={!canContinue || status === 'submitting'}
              className={cn(PRIMARY_BUTTON_CLASS, 'flex-1')}
            >
              {status === 'submitting'
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
                // The label names where Next actually goes. Tied to the step
                // instead, it promised "Выбрать время" on a route where the
                // time step had already been answered and skipped.
                if (nextStep === 'time') return t.publicPage.pickTime;
                if (nextStep === 'contacts') return t.publicPage.book;
                return t.common.next;
              })()}
            </button>
          )}
        </div>
      }
    >
      <StepChips steps={route} current={current} />

      {/* Смена шага — медленный fade 500ms; keyed-ремонт перезапускает
          его. */}
      <div key={current} className="anim-luxury-fade">
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
             валидация и озвучивание ошибок принадлежат продукту; этот мир
             только одевает их. */
          <BookingContactsStep
            flow={flow}
            formId={formId}
            classes={{
              summary: 'flex flex-col gap-1.5 border border-border-strong bg-bg-raised px-4 py-3.5',
              label: LABEL_CLASS,
              input: INPUT_CLASS,
              /* Ошибка — медленный fade 400ms, чернильная рамка с текстом
                 `--danger`. */
              error: 'anim-luxury-error border border-border-strong bg-transparent text-danger',
            }}
          />
        ) : null}
      </div>
    </SheetBase>
  );
}

/**
 * Хук-хост шторки (§7.2): создаёт flow движка и передаёт его контрактной
 * шторке мира. Секции вызывают его с теми же аргументами; `key` на стороне
 * вызова даёт свежий flow на субъекта (карточка услуги в прайсе).
 */
export function BookingFlowSheet(args: UseBookingFlowArgs) {
  const flow = useBookingFlow(args);
  return <BookingSheet flow={flow} org={args.org} chrome={sheetChrome} />;
}
