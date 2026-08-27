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
import {
  FOCUS_RING,
  LABEL_CLASS,
  ORB_RING,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from './ui';

/* Поле ввода — капсула со стеклом внутри (`.sheet-dt` файла). Кегль 16px,
   чтобы iOS не зумил форму. */
const INPUT_CLASS =
  'aura-veil h-12 w-full rounded-[var(--field-radius)] px-4 text-base text-ink outline-none transition-[border-color,box-shadow] duration-[var(--dur-hover)] ease-[var(--ease-style)] placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent';

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
 * Строка «Дата и время» — `.sheet-dt` файла: выбранное крупно, рядом
 * «Изменить» градиентом, уводящее на шаг времени.
 *
 * Полосы прогресса в этом мире нет. Она была в первой редакции и приехала
 * из мира soft, а не из `aura.html`: там шторка — это одна спокойная
 * карточка «вот ваша запись», и сегментированный индикатор превращал её в
 * мастер настройки. Где человек находится, говорит заголовок шторки.
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
    <div className="aura-veil flex items-center justify-between gap-3 rounded-[22px] px-[18px] py-4">
      <b className="min-w-0 truncate text-sm font-semibold tracking-[-0.01em] text-ink">{label}</b>
      {onChange ? (
        <button
          type="button"
          onClick={onChange}
          className={cn(
            'aura-grad-text shrink-0 cursor-pointer rounded-sm text-[12.5px] font-semibold',
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
 * Шторка записи мира AURA (`aura.html`, `.sheet`): стеклянный лист снизу —
 * хром задаёт `chrome.tsx` (капсула-ручка 44×5, гашение 35% с размытием
 * 10px), сцены шагов — собственные; машина состояний общая
 * (`useBookingFlow`, контракт §7.3).
 *
 * Успех — орб (`.ok-orb` файла): тот же дышащий круг, что встречает в
 * шапке, только с галочкой. Мир подтверждает светом, а не плашкой.
 * Статусные цвета при этом неприкосновенны в любом мире: «ждёт
 * подтверждения» остаётся янтарным, «подтверждена» — зелёным.
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

  /*
   * Подпись выбранного окна собирается из того, что уже отдаёт движок:
   * дни со своими подписями и id выбранного слота. Заводить ради неё поле
   * в контракте не нужно — и не следует (правило роста контрактов §7.7:
   * визуальное состояние мира в движок не переезжает).
   */
  const chosen = effectiveSlotId
    ? days
        .flatMap((day) => day.slots.map((slot) => ({ day, slot })))
        .find((pair) => pair.slot.id === effectiveSlotId)
    : undefined;
  const chosenTimeLabel = chosen ? `${chosen.day.label} · ${chosen.slot.time}` : null;

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
        <div className="anim-aura-rise flex flex-col gap-5 pb-1 text-center">
          <div>
            <span
              aria-hidden="true"
              className="aura-orb-glow mx-auto flex h-[88px] w-[88px] items-center justify-center rounded-full text-3xl text-bg shadow-[var(--media-shadow)]"
              style={{ background: ORB_RING, ['--aura-breath' as string]: '6s' }}
            >
              ✓
            </span>

            <p
              className={cn(
                'mt-4 text-[11px] font-semibold uppercase tracking-[0.2em]',
                awaiting ? 'text-warning' : 'text-success',
              )}
            >
              {awaiting ? t.publicPage.statusPending : t.publicPage.statusConfirmed}
            </p>

            <p className="mt-3 font-display text-[26px] leading-tight tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink">
              {awaiting
                ? t.publicPage.awaitingConfirmation
                : `${receipt.guestName}, ${t.publicPage.weAwaitYou}`}
            </p>

            <p className="mt-2.5 text-[13.5px] font-light leading-[1.8] tabular-nums text-ink-soft">
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

          {/* Квитанция — стеклянный лист: что именно и почём. */}
          <div className="aura-veil flex w-full flex-col gap-1.5 rounded-[var(--card-radius)] px-5 py-4 text-left">
            {receipt.services.map((service) => (
              <div key={service.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-light text-ink-soft">
                  {service.name}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-ink">
                  {formatPrice(service.priceAmountMinorUnits, service.priceCurrency, locale)}
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2.5">
              <span className="text-sm font-light text-ink-soft">
                {formatDuration(receipt.durationMinutes, t.common)}
              </span>
              <span className="font-display text-xl font-semibold tabular-nums text-ink">
                {formatPrice(receipt.priceMinorUnits, receipt.currency, locale)}
              </span>
            </div>
          </div>

          {org.phone ? (
            <p className="text-xs font-light text-ink-soft">
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
            buttonClassName={cn(PRIMARY_BUTTON_CLASS, 'min-h-[52px] w-full')}
            secondaryClassName={cn(SECONDARY_BUTTON_CLASS, 'min-h-[50px] w-full')}
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
              className={cn(SECONDARY_BUTTON_CLASS, 'h-[52px] w-[52px] shrink-0 text-lg')}
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
              className={cn(PRIMARY_BUTTON_CLASS, 'h-[56px] flex-1')}
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
              className={cn(PRIMARY_BUTTON_CLASS, 'h-[56px] flex-1')}
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
      {/* Выбранное время стоит над сценой, а не внутри неё: в файле это
          первое, что читается под заголовком шторки, и остаётся на месте,
          пока человек перебирает услуги. */}
      {chosenTimeLabel ? (
        <div className="mb-5 flex flex-col gap-2.5">
          <p className={LABEL_CLASS}>{t.publicPage.stepTime}</p>
          {/* «Изменить» появляется там, где шаг назад и есть возврат ко
              времени, — на контактах. Прыжка на произвольный шаг в машине
              записи нет, и выдумывать его ради кнопки значило бы растить
              контракт движка под вид одного мира. */}
          <ChosenTime
            label={chosenTimeLabel}
            changeLabel={t.common.back}
            onChange={current === 'contacts' ? actions.goBack : undefined}
          />
        </div>
      ) : null}

      <p className={cn('mb-2.5', LABEL_CLASS)}>{stepLabel(current, t)}</p>

      {/* Сцены сменяются растворением — тем же подъёмом, каким приходит
          любая секция мира; keyed-ремонт перезапускает его. */}
      <div key={current} className="anim-aura-rise">
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
              summary: 'aura-veil flex flex-col gap-1.5 rounded-[var(--card-radius)] px-5 py-4',
              label: LABEL_CLASS,
              input: INPUT_CLASS,
              error:
                'anim-aura-rise rounded-[var(--card-radius)] border border-danger bg-danger-soft text-danger',
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
