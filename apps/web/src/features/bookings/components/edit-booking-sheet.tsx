'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { SheetSection } from '@/components/ui/sheet-parts';
import { Textarea } from '@/components/ui/textarea';
import type { Service } from '@/features/services/types';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDuration, formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { Booking, UpdateBookingInput } from '../types';

const FORM_ID = 'edit-booking-form';

/**
 * Правка записи — шторка `editBooking` прототипа «Кабинет 2026»: услуги
 * пилюлями и сколько времени они требуют, контакты, заметка.
 *
 * Времени визита в форме нет намеренно: одна форма на «поменять час» и
 * «дописать услугу» дала бы одной кнопке «Сохранить» два разных смысла и два
 * несвязанных набора причин отказа. Перенос — своя шторка из карточки визита:
 * он двигает окна календаря и может не состояться из-за чужой записи, а смена
 * имени — нет.
 */
function EditBookingForm({
  booking,
  services,
  onSubmit,
}: {
  booking: Booking;
  services: Service[];
  onSubmit: (input: UpdateBookingInput) => Promise<void>;
}) {
  const t = useT();
  const locale = useLocale();

  /* Начальное состояние — из самой записи, а не из каталога: в визите могут
     стоять услуги, которые мастер с тех пор убрала из прайса, и «сохранить»
     не должно молча их выбросить. */
  const [serviceIds, setServiceIds] = useState<string[]>(() =>
    booking.items.map((item) => item.serviceId),
  );
  const [guestName, setGuestName] = useState(booking.guestName ?? '');
  const [guestPhone, setGuestPhone] = useState(booking.guestPhone ?? '');
  const [guestInstagram, setGuestInstagram] = useState(booking.guestInstagram ?? '');
  const [notes, setNotes] = useState(booking.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  /*
   * Что показать в списке услуг: весь действующий прайс плюс то, что уже стоит
   * в визите.
   *
   * Второе слагаемое — не мелочь. Услуга, снятая с прайса или выключенная,
   * осталась бы без пилюли, её было бы негде снять, а «Сохранить» отправил бы
   * состав без неё — то есть форма молча меняла бы то, чего мастер не трогала.
   */
  const rows = useMemo(() => {
    const catalogue = new Map(services.filter((service) => service.isActive).map((s) => [s.id, s]));
    for (const item of booking.items) {
      if (!catalogue.has(item.serviceId)) {
        catalogue.set(item.serviceId, {
          id: item.serviceId,
          name: item.serviceNameSnapshot,
          durationMinutes: item.durationMinutesSnapshot,
          priceAmount: item.priceAmountSnapshot,
          priceCurrency: item.priceCurrencySnapshot,
        } as Service);
      }
    }
    return [...catalogue.values()];
  }, [services, booking.items]);

  const totalMinutes = rows
    .filter((service) => serviceIds.includes(service.id))
    .reduce((sum, service) => sum + service.durationMinutes, 0);

  function toggle(serviceId: string) {
    setServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({ serviceIds, guestName, guestPhone, guestInstagram, notes });
    } catch (submitError) {
      /* Причина называется словами кабинета: «не хватает времени подряд» —
         это решение, которое мастер может принять (убрать услугу, перенести),
         а не сбой, о котором ей нечего думать. */
      setError(describeApiError(submitError, t, t.bookings.editNoTime));
    }
  }

  return (
    <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-6">
      <SheetSection title={t.bookings.editServices}>
        <div className="pick-chips" role="group" aria-label={t.bookings.editServices}>
          {rows.map((service) => (
            <button
              key={service.id}
              type="button"
              className="pick-chip"
              aria-pressed={serviceIds.includes(service.id)}
              onClick={() => toggle(service.id)}
            >
              {service.name}
              <span className="pick-chip__meta">
                {' '}
                · {formatPrice(service.priceAmount, service.priceCurrency, locale)}
              </span>
            </button>
          ))}
        </div>
        {/* Сколько времени подряд требует состав: мастер меняет его ради этого,
            и держать сумму в голове она не обязана. */}
        {totalMinutes > 0 ? (
          <p className="form-field__hint">
            {fmt(t.bookings.needForServices, {
              duration: formatDuration(totalMinutes, {
                hoursShort: t.common.hoursShort,
                minutesShort: t.common.minutesShort,
              }),
            })}
          </p>
        ) : null}
      </SheetSection>

      <SheetSection title={t.bookings.sectionClient}>
        <Field id="edit-guest-name" label={t.bookings.clientName}>
          <Input
            id="edit-guest-name"
            required
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field id="edit-guest-phone" label={t.bookings.phone}>
            <Input
              id="edit-guest-phone"
              type="tel"
              value={guestPhone}
              onChange={(event) => setGuestPhone(event.target.value)}
            />
          </Field>
          <Field id="edit-guest-instagram" label="Instagram">
            <Input
              id="edit-guest-instagram"
              value={guestInstagram}
              onChange={(event) => setGuestInstagram(event.target.value)}
              placeholder="username"
            />
          </Field>
        </div>
      </SheetSection>

      <SheetSection title={t.bookings.note}>
        <Textarea
          id="edit-notes"
          rows={3}
          aria-label={t.bookings.note}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t.bookings.noteHint}
        />
      </SheetSection>

      {error ? <FieldError>{error}</FieldError> : null}
    </form>
  );
}

export function EditBookingSheet({
  open,
  onOpenChange,
  booking,
  services,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  services: Service[];
  onSubmit: (input: UpdateBookingInput) => Promise<void>;
  submitting: boolean;
}) {
  const t = useT();

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.bookings.editTitle}
      description={t.bookings.editHint}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={submitting}>
            {submitting ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      {/*
        Ключ по id записи, а не эффект, сбрасывающий поля.
        Шторка остаётся смонтированной между открытиями, поэтому без ключа
        форма показала бы прошлую запись. Ключ на **форме** (шторка своей
        анимации при этом не теряет) заново её монтирует — состояние берётся из
        начальных значений, и ни одного `setState` в эффекте не нужно.

        Ключ намеренно по `id`, а не по всему объекту: фоновое обновление
        списка не должно стирать то, что мастер уже успела напечатать.
      */}
      {booking ? (
        <EditBookingForm
          key={booking.id}
          booking={booking}
          services={services}
          onSubmit={onSubmit}
        />
      ) : null}
    </Sheet>
  );
}
