'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useLocale, useT } from '@/lib/i18n';
import { describeApiError } from '@/lib/describe-api-error';
import { formatPrice } from '@/lib/format';
import type { Service } from '@/features/services/types';

import type { Booking, UpdateBookingInput } from '../types';

/**
 * Правка записи: состав услуг, контакты, заметка.
 *
 * Времени визита здесь нет намеренно. Перенос — другая операция, и живёт он в
 * расписании: одна форма на «поменять час» и «дописать услугу» дала бы одной
 * кнопке «Сохранить» два разных смысла и два несвязанных набора причин отказа
 * («это время прошло» против «не хватает времени подряд»).
 */
function EditBookingForm({
  booking,
  services,
  onSubmit,
  submitting,
}: {
  booking: Booking;
  services: Service[];
  onSubmit: (input: UpdateBookingInput) => Promise<void>;
  submitting: boolean;
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
   * осталась бы без строки, её переключатель было бы негде выключить, а
   * «Сохранить» отправил бы состав без неё — то есть форма молча меняла бы то,
   * чего мастер не трогала.
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

  const currency = booking.items[0]?.priceCurrencySnapshot ?? 'EUR';
  const chosen = rows.filter((service) => serviceIds.includes(service.id));
  const totalAmount = chosen.reduce((sum, service) => sum + service.priceAmount, 0);
  const totalMinutes = chosen.reduce((sum, service) => sum + service.durationMinutes, 0);

  function toggle(serviceId: string, on: boolean) {
    setServiceIds((current) =>
      on ? [...new Set([...current, serviceId])] : current.filter((id) => id !== serviceId),
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({
        serviceIds,
        guestName,
        guestPhone,
        guestInstagram,
        notes,
      });
    } catch (submitError) {
      /* Причина называется словами кабинета: «не хватает времени подряд» —
         это решение, которое мастер может принять (убрать услугу, перенести),
         а не сбой, о котором ей нечего думать. */
      setError(describeApiError(submitError, t, t.bookings.editNoTime));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-ink-soft">{t.bookings.editServices}</p>
        {/* Переключатель на строку, а не сетка «таблеток»: услуг в визите может
            быть несколько, и это выбор «да/нет» по каждой — та же форма, что у
            правил записи на этом же экране. */}
        <div className="flex flex-col gap-1.5">
          {rows.map((service) => (
            <label
              key={service.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-bg-sunken px-4 py-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">
                  {service.name}
                </span>
                <span className="mt-0.5 block text-xs tabular-nums text-ink-soft">
                  {formatPrice(service.priceAmount, service.priceCurrency, locale)} ·{' '}
                  {service.durationMinutes} {t.common.minutesShort}
                </span>
              </span>
              <Switch
                checked={serviceIds.includes(service.id)}
                onCheckedChange={(checked) => toggle(service.id, checked)}
                label={service.name}
              />
            </label>
          ))}
        </div>
        {/* Итог визита прямо под списком: мастер меняет состав ради него, и
            держать сумму с длительностью в голове она не обязана. */}
        <p className="px-1 text-sm text-ink-soft">
          <span className="font-semibold text-ink">
            {formatPrice(totalAmount, currency, locale)}
          </span>{' '}
          · {totalMinutes} {t.common.minutesShort}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="edit-guest-name" className="text-sm font-semibold text-ink-soft">
          {t.bookings.clientName}
        </label>
        <Input
          id="edit-guest-name"
          required
          value={guestName}
          onChange={(event) => setGuestName(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="edit-guest-phone" className="text-sm font-semibold text-ink-soft">
          {t.bookings.phone}
        </label>
        <Input
          id="edit-guest-phone"
          type="tel"
          value={guestPhone}
          onChange={(event) => setGuestPhone(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="edit-guest-instagram" className="text-sm font-semibold text-ink-soft">
          Instagram
        </label>
        <Input
          id="edit-guest-instagram"
          value={guestInstagram}
          onChange={(event) => setGuestInstagram(event.target.value)}
          placeholder="username"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="edit-notes" className="text-sm font-semibold text-ink-soft">
          {t.bookings.note}
        </label>
        <Textarea
          id="edit-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      {error ? <FieldError>{error}</FieldError> : null}

      {/* Без единой услуги визит не имеет длительности, а значит и времени,
          которое занимает: сервер такой состав отклонит, и кнопка говорит об
          этом заранее, а не после отправки. */}
      <Button type="submit" disabled={serviceIds.length === 0 || submitting} className="w-full">
        {submitting ? t.common.saving : t.common.save}
      </Button>
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
    <Sheet open={open} onOpenChange={onOpenChange} title={t.bookings.editTitle}>
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
          submitting={submitting}
        />
      ) : null}
    </Sheet>
  );
}
