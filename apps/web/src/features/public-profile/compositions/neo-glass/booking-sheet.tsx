'use client';

import { ArrowLeft } from '@phosphor-icons/react';
import { useId } from 'react';

import { BookingContactsStep } from '../../shared/booking-contacts-step';
import { BookingFollowup } from '../../shared/booking-followup';
import { SheetBase } from '../../shared/sheet-base';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { fmt, useLocale, useT, type Messages } from '@/lib/i18n';

import { formatDuration } from '../../engine/booking-cart';
import {
  useBookingFlow,
  type BookingStep,
  type UseBookingFlowArgs,
} from '../../engine/use-booking-flow';
import type { BookingSheetProps } from '../../contracts/booking';
import { AddonsStep, ServicesStep, TimeStep } from './booking-steps';
import { sheetChrome } from './chrome';
import { FOCUS_RING, LABEL_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from './ui';

/* Поле — утопленное стекло 12px (§9 «Поля ввода»): подложка вдавлена,
   фокус — бирюзовое кольцо 2px. Кегль 16px, чтобы iOS не зумил форму. */
const INPUT_CLASS =
  'neo-glass-sunken h-12 w-full rounded-[var(--field-radius)] px-3.5 text-base text-ink outline-none transition-[border-color,box-shadow] duration-[var(--dur-hover)] ease-[var(--ease-style)] placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent';

const FULL_DATE_LABEL_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
};

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
 * Прогресс записи — стеклянные сегменты (§9): пройденные и текущий залиты
 * бирюзой с верхним бликом, будущие остаются пустым стеклом. Заполнение
 * едет `scaleX` на пружинной кривой, поэтому сегмент наливается, а не
 * перекрашивается. Полоса декоративна — позицию озвучивает заголовок
 * шторки, — поэтому скрыта от читалок.
 */
function StepSegments({ steps, current }: { steps: BookingStep[]; current: BookingStep }) {
  const t = useT();
  const index = steps.indexOf(current);
  return (
    <div aria-hidden="true" className="mb-4 flex flex-col gap-2">
      <div className="flex gap-1.5">
        {steps.map((step, position) => (
          <span key={step} className="neo-glass-sunken h-1.5 flex-1 overflow-hidden rounded-full">
            <span
              className={cn(
                'block h-full origin-left rounded-full bg-accent bg-[image:var(--surface-sheen)] transition-transform duration-[var(--dur-reveal)] ease-[var(--ease-style)] motion-reduce:transition-none',
                position <= index ? 'scale-x-100' : 'scale-x-0',
              )}
            />
          </span>
        ))}
      </div>
      <span className={LABEL_CLASS}>
        {index + 1} / {steps.length} · {stepLabel(current, t)}
      </span>
    </div>
  );
}

/**
 * Шторка записи мира Neo Glass (§9): стеклянная панель, влетающая снизу, —
 * хром задаёт `chrome.tsx` (парящая панель 28px, капсула-ручка 40×5,
 * гашение 45% с blur 8px), сцены шагов — собственные; машина состояний
 * общая (`useBookingFlow`, контракт §7.3).
 *
 * Шаги сменяются пространственно: содержимое приходит направленным сдвигом
 * на 24px, каскад 30ms; keyed-ремонт перезапускает его. Success —
 * материализация квитанции с однократным бликом по стеклу: мир
 * подтверждает светом, а не галочкой. Статусные цвета неприкосновенны в
 * любом мире.
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
        <div className="anim-neo-glass-materialize flex flex-col gap-5 pb-1">
          {/* Два разных факта — два статусных цвета: янтарь ожидания и
              зелень ответа. Бейдж мира — стеклянная капсула. */}
          <div>
            <span
              className={cn(
                'neo-glass-pane inline-block rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]',
                awaiting ? 'text-warning' : 'text-success',
              )}
            >
              {awaiting ? t.publicPage.statusPending : t.publicPage.statusConfirmed}
            </span>
            <p className="mt-3 font-display text-[22px] leading-tight tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink">
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

          {/* Квитанция — стеклянная карточка, по которой один раз пробегает
              блик: стекло подтверждает светом (§9 Success). */}
          <div className="neo-glass-pane relative flex w-full flex-col gap-1.5 overflow-hidden rounded-[var(--card-radius)] px-4 py-3.5 text-left">
            <span
              aria-hidden="true"
              className="anim-neo-glass-glint pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--ink)_18%,transparent),transparent)]"
            />
            {receipt.services.map((service) => (
              <div key={service.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-ink-soft">{service.name}</span>
                <span className="shrink-0 text-sm tabular-nums text-ink">
                  {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-[var(--surface-edge)] pt-2.5">
              <span className="text-sm text-ink-soft">
                {formatDuration(receipt.durationMinutes, t.publicPage)}
              </span>
              <span className="font-display text-[20px] tabular-nums [font-weight:var(--display-weight)] text-ink">
                {formatPrice(receipt.priceMinorUnits, receipt.currency)}
              </span>
            </div>
          </div>

          {org.phone ? (
            <p className="text-xs text-ink-soft">
              {t.publicPage.cancelByPhone}{' '}
              <a
                href={`tel:${org.phone.replace(/\s/g, '')}`}
                className={cn('rounded-sm font-semibold text-accent', FOCUS_RING)}
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
            secondaryClassName={cn(SECONDARY_BUTTON_CLASS, 'min-h-11 w-full')}
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

  const submitting = status === 'submitting';

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
              className={cn(SECONDARY_BUTTON_CLASS, 'h-13 w-13 shrink-0')}
            >
              <ArrowLeft size={18} weight="regular" />
            </button>
          ) : null}

          {current === 'contacts' ? (
            /* Отправка — блик, пробегающий по капсуле (§9 Loading): ожидание
               держит тот же материал, что и остальная страница. */
            <button
              type="submit"
              form={formId}
              disabled={!canContinue || submitting}
              className={cn(PRIMARY_BUTTON_CLASS, 'relative flex-1 overflow-hidden')}
            >
              {submitting ? (
                <span
                  aria-hidden="true"
                  className="anim-neo-glass-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--accent-contrast)_28%,transparent),transparent)]"
                />
              ) : null}
              {submitting
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
      <StepSegments steps={route} current={current} />

      {/* Смена шага — пространственный сдвиг вперёд; keyed-ремонт
          перезапускает его. */}
      <div key={current} className="anim-neo-glass-month-next">
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
                'neo-glass-pane flex flex-col gap-1.5 rounded-[var(--card-radius)] px-4 py-3.5',
              label: LABEL_CLASS,
              input: INPUT_CLASS,
              /* Ошибка приходит материализацией, а не вспышкой: стеклянная
                 карточка с кромкой `--danger`. */
              error:
                'anim-neo-glass-materialize rounded-[var(--card-radius)] border border-danger bg-danger-soft text-danger',
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
