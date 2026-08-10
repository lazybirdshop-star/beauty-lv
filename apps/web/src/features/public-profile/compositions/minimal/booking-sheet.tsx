'use client';

import { ArrowLeft } from '@phosphor-icons/react';
import { useId } from 'react';

import { BookingContactsStep } from '../../shared/booking-contacts-step';
import { BookingFollowup } from '../../shared/booking-followup';
import { SheetBase } from '../../shared/sheet-base';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { fmt, useLocale, useT } from '@/lib/i18n';

import { formatDuration } from '../../engine/booking-cart';
import {
  useBookingFlow,
  type BookingStep,
  type UseBookingFlowArgs,
} from '../../engine/use-booking-flow';
import type { BookingSheetProps } from '../../contracts/booking';
import { AddonsStep, ServicesStep, TimeStep } from './booking-steps';
import { sheetChrome } from './chrome';

/* Поля мира: радиус 8px, белая заливка, волосяная линейка; фокус — кольцо
   черни 2px с отступом 2px (§6 «Поля ввода»). Кегль 16px. */
const INPUT_CLASS =
  'h-12 w-full rounded-[var(--field-radius)] border border-border bg-bg-raised px-3.5 text-base text-ink outline-none transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] placeholder:text-ink-faint focus:border-border-strong focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-raised';

/* Лейблы строчные, `ink-faint`, вес 500: Minimal не кричит даже метками (§6). */
const LABEL_CLASS = 'text-xs font-medium text-ink-faint';

/* Primary мира: чернильная заливка, 8px, строчные, вес 600; hover светлеет
   на ~6% за 100ms; press — цветом, без scale и сдвига. Ни одной тени. */
const PRIMARY_BUTTON_CLASS =
  'inline-flex h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--control-radius)] bg-accent text-[15px] font-semibold text-accent-contrast transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] hover:bg-[color-mix(in_srgb,var(--accent)_94%,white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-raised disabled:pointer-events-none disabled:border disabled:border-border-strong disabled:bg-transparent disabled:text-ink-soft';

/* Secondary мира: контур по `border-strong`, hover — тихая заливка. */
const SECONDARY_BUTTON_CLASS =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--control-radius)] border border-border-strong text-[15px] font-semibold text-ink transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-raised disabled:pointer-events-none disabled:opacity-50';

const FULL_DATE_LABEL_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
};

/**
 * Прогресс маршрута — сегменты-линейки 2px (§6 «Форма»), а не «шаг 2 из 4»:
 * шаг допродаж существует, только когда мастер настроил их, и напечатанный
 * счёт врал бы вполовину случаев. Заполнение — сменой заливки за 160ms,
 * как всё в этом мире. Сегменты декоративны: позицию озвучивает заголовок
 * шторки.
 */
function StepProgress({ steps, current }: { steps: BookingStep[]; current: BookingStep }) {
  const index = steps.indexOf(current);
  return (
    <div aria-hidden="true" className="mb-5 flex gap-1">
      {steps.map((step, position) => (
        <span
          key={step}
          className={cn(
            'h-0.5 flex-1 transition-colors duration-[var(--dur-reveal)] ease-[var(--ease-style)]',
            position <= index ? 'bg-accent' : 'bg-border',
          )}
        />
      ))}
    </div>
  );
}

/**
 * Шторка записи мира Minimal: хром (линейка-шов вместо ручки, ни одной
 * тени) и сцены шагов — собственные; машина состояний — общая
 * (`useBookingFlow`, контракт §7.3). Шаги сменяются crossfade 120ms
 * (§6 «Движение»), keyed ремонт перезапускает его. Success — тишина:
 * crossfade к квитанции 200ms, никакого конфетти и галочек-рисунков;
 * статус («ждёт подтверждения»/«подтверждена») несёт бейдж 6px на
 * статусной подложке — цвет статуса неприкосновенен в любом мире.
 */
export function BookingSheet({ flow, org, chrome }: BookingSheetProps) {
  const t = useT();
  const locale = useLocale();
  const FULL_DATE_LABEL = new Intl.DateTimeFormat(locale, FULL_DATE_LABEL_OPTS);
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
        <div className="anim-minimal-receipt flex flex-col gap-5 pb-1">
          {/* Два разных факта — два статусных цвета: янтарь ожидания и зелень
              ответа. Иконок-рисунков нет: подтверждение читается словом. */}
          <div>
            <span
              className={cn(
                'inline-flex items-center rounded-[6px] px-2 py-1 text-[11px] font-medium',
                awaiting ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success',
              )}
            >
              {awaiting ? t.publicPage.statusPending : t.publicPage.statusConfirmed}
            </span>
            <p className="mt-3 font-display text-[20px] leading-tight tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink">
              {awaiting
                ? t.publicPage.awaitingConfirmation
                : `${receipt.guestName}, ${t.publicPage.weAwaitYou}`}
            </p>
            <p className="mt-1.5 text-sm tabular-nums text-ink-soft">
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

          {/* Квитанция — карточка мира: белая, 12px, волосяная линейка. */}
          <div className="flex w-full flex-col gap-1.5 rounded-[var(--card-radius)] border border-border bg-bg-raised px-4 py-3.5 text-left">
            {receipt.services.map((service) => (
              <div key={service.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-ink-soft">{service.name}</span>
                <span className="shrink-0 text-sm tabular-nums text-ink">
                  {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2.5">
              <span className="text-sm text-ink-soft">
                {formatDuration(receipt.durationMinutes, t.publicPage)}
              </span>
              <span className="text-[17px] font-semibold tabular-nums text-ink">
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
            buttonClassName={cn(PRIMARY_BUTTON_CLASS, 'min-h-12 w-full')}
            secondaryClassName={cn(SECONDARY_BUTTON_CLASS, 'min-h-11 w-full text-sm')}
          />

          <button
            type="button"
            className={cn(SECONDARY_BUTTON_CLASS, 'h-12 w-full')}
            onClick={() => handleOpenChange(false)}
          >
            {t.publicPage.done}
          </button>
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
          ? `${formatDuration(totals.durationMinutes, t.publicPage)} · ${formatPrice(totals.priceMinorUnits, totals.currency)}`
          : undefined
      }
      footer={
        <div className="flex gap-2">
          {current !== 'services' ? (
            <button
              type="button"
              onClick={actions.goBack}
              aria-label={t.common.back}
              className={cn(SECONDARY_BUTTON_CLASS, 'h-14 w-14 shrink-0')}
            >
              <ArrowLeft size={18} weight="light" />
            </button>
          ) : null}

          {current === 'contacts' ? (
            <button
              type="submit"
              form={formId}
              disabled={!canContinue || status === 'submitting'}
              className={PRIMARY_BUTTON_CLASS}
            >
              {status === 'submitting'
                ? t.publicPage.sending
                : fmt(t.publicPage.bookFor, {
                    price: formatPrice(totals.priceMinorUnits, totals.currency),
                  })}
            </button>
          ) : (
            <button
              type="button"
              onClick={actions.goNext}
              disabled={!canContinue}
              className={PRIMARY_BUTTON_CLASS}
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
      <StepProgress steps={route} current={current} />

      {/* Смена шага — crossfade 120ms (§6); keyed ремонт перезапускает его. */}
      <div key={current} className="anim-minimal-crossfade">
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
              summary:
                'flex flex-col gap-1.5 rounded-[var(--card-radius)] border border-border bg-bg-raised px-4 py-3.5',
              label: LABEL_CLASS,
              input: INPUT_CLASS,
              /* Ошибка появляется за 120ms, волосяная линейка `--danger`
                 слева от текста (§6). */
              error: 'anim-minimal-crossfade border-l-2 border-l-danger bg-transparent text-danger',
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
