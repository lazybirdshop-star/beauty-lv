'use client';

import { Warning } from '@phosphor-icons/react';
import { useId, type ComponentType, type ReactNode } from 'react';

import { PersonalDataNotice } from '@/features/legal/components/personal-data-notice';
import { formatPrice } from '@/lib/format';
import { fmt } from '@/lib/i18n/messages';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { BookingFlow } from '../contracts/booking';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';

/**
 * Классы подачи мира (BRAND_STYLE_ARCHITECTURE.md §7.6, правка §6 из П0).
 * Мир задаёт вид полей, лейблов, сводки и ошибки — но не переписывает саму
 * сцену: семь копий формы гостя не существует никогда.
 */
export interface BookingContactsStepClasses {
  /** Форма целиком; по умолчанию — колонка с продуктовым ритмом. */
  form?: string;
  /** Сводка записи (услуги + время + итог) над полями. */
  summary?: string;
  /** Обёртка поля: label + control (+ ошибка мира внутри FieldChrome). */
  field?: string;
  label?: string;
  input?: string;
  /** Блок ошибки отправки (`role="alert"`). */
  error?: string;
}

export interface BookingContactsStepSlots {
  /**
   * Декоративная обёртка поля мира (шампань-рамка, утопленное стекло,
   * льняная линейка). По умолчанию — без обёртки. Разметка внутри — свобода
   * мира; само поле (label, input, поведение) — одно на продукт.
   * `invalid` отражает ошибочный статус flow (конфликт/отказ после
   * отправки); полевая валидация остаётся нативной (`required`, типы).
   */
  FieldChrome?: ComponentType<{ children: ReactNode; invalid: boolean }>;
}

/**
 * Просит форму записи отправиться саму — вместо `type="submit"` на кнопке
 * подвала.
 *
 * Кнопка подвала одна на все шаги, и React переиспользует один и тот же
 * DOM-узел, меняя ему лишь атрибуты. Нажатие «дальше» на шаге времени
 * успевало превратить эту кнопку в `submit` до того, как браузер выполнял
 * действие по умолчанию того же самого нажатия, — и один тап и переходил к
 * контактам, и отправлял запись. Пока поля были пусты, кнопка приезжала
 * выключенной, и увидеть это было нельзя; с подставленными данными вошедшего
 * человека один тап записывал мгновенно, не дав ничего проверить.
 *
 * `requestSubmit`, а не `submit`: нативная проверка полей (и её перевод)
 * обязана остаться на месте.
 */
export function submitBookingForm(formId: string): void {
  const form = document.getElementById(formId);
  if (form instanceof HTMLFormElement) form.requestSubmit();
}

const FULL_DATE_LABEL_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
};

/**
 * Единый шаг «Контакты» записи для всех миров (§7.6): поля имени, телефона
 * и Instagram, валидация (правила — движка: `canContinue`, нативные
 * `required`), отображение и озвучивание ошибок (`role="alert"`), состояние
 * отправки — одни на продукт. Слияние двух прежних копий
 * (`compositions/soft/booking-sheet.tsx` и `compositions/poster/booking-sheet.tsx`);
 * их различия — только классы, они и приходят пропсом.
 *
 * `formId` проброшен наружу, потому что кнопка отправки живёт в подвале
 * шторки — вне скролла и вне этой сцены (`<Button form={formId}>`).
 */
export function BookingContactsStep({
  flow,
  formId,
  classes,
  slots,
}: {
  flow: BookingFlow;
  formId: string;
  classes?: BookingContactsStepClasses;
  slots?: BookingContactsStepSlots;
}) {
  const t = useT();
  const validate = useLocalizedValidation();
  const locale = useLocale();
  const FULL_DATE_LABEL = new Intl.DateTimeFormat(locale, FULL_DATE_LABEL_OPTS);
  const nameId = useId();
  const phoneId = useId();
  const instagramId = useId();

  const { state, derived, actions } = flow;
  const { status, conflict, guest, knownGuest } = state;
  const { selectedServices, totals, chosenSlot } = derived;
  const failed = status === 'error' || status === 'blocked';

  const formClass = classes?.form ?? 'flex flex-col gap-3.5';
  const fieldClass = classes?.field ?? 'flex flex-col gap-1.5';
  const labelClass = classes?.label ?? 'text-xs font-semibold text-ink-soft';
  const inputClass =
    classes?.input ??
    'h-12 w-full rounded-[var(--field-radius)] border border-border bg-bg-raised px-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent-soft';
  const FieldChrome = slots?.FieldChrome;

  const nameField = (
    <div className={fieldClass}>
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
  );

  const phoneField = (
    <div className={fieldClass}>
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
  );

  const instagramField = (
    <div className={fieldClass}>
      <label htmlFor={instagramId} className={labelClass}>
        Instagram <span className="font-normal text-ink-faint">— {t.publicPage.optional}</span>
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
  );

  return (
    <form
      ref={validate}
      id={formId}
      onSubmit={(event) => {
        event.preventDefault();
        void actions.submit();
      }}
      className={formClass}
    >
      {/* Что записываем, повторено там, где человек подтверждает: сюда ведут
          несколько маршрутов, и корзину он мог не видеть с первого шага. */}
      <div className={classes?.summary ?? 'flex flex-col gap-1.5 border border-border px-3.5 py-3'}>
        {selectedServices.map((service) => (
          <div key={service.id} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-[13px] text-ink-soft">{service.name}</span>
            <span className="shrink-0 text-[13px] text-ink">
              {formatPrice(service.priceAmountMinorUnits, service.priceCurrency, locale)}
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
            {formatPrice(totals.priceMinorUnits, totals.currency, locale)}
          </span>
        </div>
      </div>

      {/* Почему поля уже заполнены. Без этой строки подставленные имя и
          телефон читаются как чужая сессия в общем браузере — и человек
          либо стирает их, либо записывает не того, кого хотел. */}
      {knownGuest ? (
        <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px] text-ink-soft">
          <span>{fmt(t.clientAccount.bookingAs, { name: knownGuest.name })}</span>
          <button
            type="button"
            onClick={actions.bookForSomeoneElse}
            className="underline underline-offset-2 transition-opacity hover:opacity-70"
          >
            {t.clientAccount.bookingForSomeoneElse}
          </button>
        </p>
      ) : null}

      {FieldChrome ? <FieldChrome invalid={failed}>{nameField}</FieldChrome> : nameField}
      {FieldChrome ? <FieldChrome invalid={failed}>{phoneField}</FieldChrome> : phoneField}
      {FieldChrome ? <FieldChrome invalid={failed}>{instagramField}</FieldChrome> : instagramField}

      {/* Под полями, а не над ними: сначала человек видит, о чём его просят,
          и только потом — кто это сохранит. Статья 13 GDPR требует назвать
          хранителя и цель в момент получения данных, и до этой строки
          политика продукта до места сбора не доходила. */}
      <PersonalDataNotice purpose="booking" />

      {failed ? (
        <p
          role="alert"
          className={cn(
            'flex items-start gap-2.5 px-3.5 py-2.5 text-[13px]',
            classes?.error ?? 'rounded-2xl bg-danger-soft text-danger',
          )}
        >
          <Warning size={17} weight="fill" className="mt-0.5 shrink-0" />
          {status === 'blocked' ? t.publicPage.bookingRefused : conflict || t.publicPage.slotTaken}
        </p>
      ) : null}
    </form>
  );
}
