'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { Client } from '@/features/clients/types';
import { serviceTone } from '@/features/services/service-tone';
import type { Service } from '@/features/services/types';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDuration, formatLongDay, formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';

import { findClientByPhone } from '../client-match';
import { getBookingStatusMeta } from '../status-meta';
import type { Booking, UpdateBookingInput } from '../types';
import { ClientStrip } from './client-strip';
import { RescheduleBlock } from './reschedule-block';
import { ServiceLine } from './service-line';
import { TimeFigure } from './time-figure';

/**
 * Правка записи: состав услуг, контакты, заметка — та же композиция, что у
 * карточки визита, с полями-нишами вместо чтения (Design System V2 §7).
 *
 * Времени визита в форме нет намеренно: одна форма на «поменять час» и
 * «дописать услугу» дала бы одной кнопке «Сохранить» два разных смысла и два
 * несвязанных набора причин отказа. Перенос — свой раздел со своей кнопкой:
 * он двигает окна календаря и может не состояться из-за чужой записи, а
 * смена имени — нет.
 */
function EditBookingForm({
  slug,
  booking,
  services,
  clients,
  members,
  onSubmit,
  onCancel,
}: {
  slug: string;
  booking: Booking;
  services: Service[];
  clients: Client[];
  /** К кому можно перевести визит при переносе. */
  members?: { id: string; name: string }[];
  onSubmit: (input: UpdateBookingInput) => Promise<void>;
  /** Отмена визита. Спрашивает подтверждение — его показывает экран. */
  onCancel?: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const statusMeta = getBookingStatusMeta(t);

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
  const bookedMinutes = booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0);
  const client = findClientByPhone(clients, booking.guestPhone);
  const durationLabel = formatDuration(totalMinutes, {
    hoursShort: t.common.hoursShort,
    minutesShort: t.common.minutesShort,
  });

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" id="edit-booking-form">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="pill" tone={statusMeta[booking.status].tone}>
          {statusMeta[booking.status].label}
        </Badge>
      </div>

      <TimeFigure
        startsAt={booking.startsAt}
        minutes={bookedMinutes}
        tone={serviceTone(booking.items[0]?.serviceId ?? booking.id)}
        line={formatLongDay(booking.startsAt, locale, timeZone)}
      />

      <section className="panel-section" aria-label={t.bookings.sectionClient}>
        <ClientStrip
          slug={slug}
          client={client}
          name={booking.guestName ?? t.admin.noName}
          phone={booking.guestPhone}
        />
      </section>

      {/* Перенос — до состава: вопрос «а можно на четверг» звучит чаще, чем
          «поменяйте телефон». */}
      <section className="panel-section">
        <RescheduleBlock slug={slug} booking={booking} members={members} />
      </section>

      <section className="panel-section" aria-label={t.bookings.editServices}>
        <h3 className="type-meta">{t.bookings.editServices}</h3>
        {/* Переключатель на строку, а не сетка «таблеток»: услуг в визите может
            быть несколько, и это выбор «да/нет» по каждой. */}
        <div className="flex flex-col">
          {rows.map((service) => (
            <ServiceLine
              key={service.id}
              name={service.name}
              minutes={service.durationMinutes}
              price={service.priceAmount}
              currency={service.priceCurrency}
              tone={serviceTone(service.id)}
              action={
                <Switch
                  checked={serviceIds.includes(service.id)}
                  onCheckedChange={(checked) => toggle(service.id, checked)}
                  label={service.name}
                />
              }
            />
          ))}
        </div>
        {/* Итог визита прямо под списком: мастер меняет состав ради него, и
            держать сумму с длительностью в голове она не обязана. */}
        <div className="panel-total">
          <span className="type-meta">
            {t.bookings.total} · {durationLabel}
          </span>
          <span className="type-title tnum">{formatPrice(totalAmount, currency, locale)}</span>
        </div>
      </section>

      <section className="panel-section flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="type-meta" htmlFor="edit-guest-name">
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
            <label className="type-meta" htmlFor="edit-guest-phone">
              {t.bookings.phone}
            </label>
            <Input
              id="edit-guest-phone"
              type="tel"
              value={guestPhone}
              onChange={(event) => setGuestPhone(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="type-meta" htmlFor="edit-guest-instagram">
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
          <label className="type-meta" htmlFor="edit-notes">
            {t.bookings.note}
          </label>
          <Textarea
            id="edit-notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <span className="type-meta">{t.bookings.noteHint}</span>
        </div>
      </section>

      {error ? <FieldError>{error}</FieldError> : null}

      {onCancel ? (
        <section className="panel-section">
          <div className="flex items-center gap-3">
            <Button type="button" variant="danger" size="sm" onClick={onCancel}>
              {t.bookings.cancelBooking}
            </Button>
            <span className="type-meta">{t.bookings.asksConfirmation}</span>
          </div>
        </section>
      ) : null}
    </form>
  );
}

export function EditBookingSheet({
  open,
  onOpenChange,
  slug,
  booking,
  services,
  clients,
  members,
  onSubmit,
  submitting,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Адрес кабинета — перенос уходит на свой маршрут этой организации. */
  slug: string;
  booking: Booking | null;
  services: Service[];
  clients: Client[];
  /** К кому можно перевести визит при переносе; пусто — вопроса нет. */
  members?: { id: string; name: string }[];
  onSubmit: (input: UpdateBookingInput) => Promise<void>;
  submitting: boolean;
  onCancel?: () => void;
}) {
  const t = useT();

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.bookings.editTitle}
      description={booking?.guestName ?? undefined}
      footer={
        /* Без единой услуги визит не имеет длительности, а значит и времени,
           которое занимает: сервер такой состав отклонит, и кнопка говорит об
           этом заранее, а не после отправки. */
        <Button type="submit" form="edit-booking-form" className="w-full" disabled={submitting}>
          {submitting ? t.common.saving : t.common.save}
        </Button>
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
          slug={slug}
          booking={booking}
          services={services}
          clients={clients}
          members={members}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      ) : null}
    </Sheet>
  );
}
