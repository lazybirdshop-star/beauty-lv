'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { FieldError } from '@/components/ui/field-error';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { SideSheet } from '@/features/dashboard-shell/components/side-sheet';
import { avatarTint, initials } from '@/lib/avatar';
import { useTimeZone } from '@/lib/timezone';

import { getBookingStatusMeta } from '../status-meta';
import { RescheduleBlock } from './reschedule-block';

/** Тон статуса продукта — в класс значка из набора. */
function statusBadgeClass(tone: string): string {
  return (
    {
      success: 'b-green',
      warning: 'b-amber',
      danger: 'b-red',
      accent: 'b-pink',
      neutral: 'b-neutral',
    }[tone] ?? 'b-neutral'
  );
}
import { Switch } from '@/components/ui/switch';
import { useLocale, useT } from '@/lib/i18n';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDateTime, formatDuration, formatPhone, formatPrice } from '@/lib/format';
import type { Service } from '@/features/services/types';

import type { Booking, UpdateBookingInput } from '../types';

/**
 * Правка записи: состав услуг, контакты, заметка.
 *
 * Времени визита здесь нет намеренно: одна форма на «поменять час» и
 * «дописать услугу» дала бы одной кнопке «Сохранить» два разных смысла и два
 * несвязанных набора причин отказа («это время прошло» против «не хватает
 * времени подряд»).
 *
 * Но намерение было только в коде, а мастер видела форму без времени и без
 * единого слова о том, где его менять. Теперь время визита названо, и рядом
 * сказано, что перенос — это отмена и новая запись. Так и есть: занятое окно
 * не переносится ни из расписания (`rescheduleAvailable` работает только со
 * свободными — под записанным человеком время не двигают молча), ни отсюда.
 * Настоящий перенос одним жестом — отдельная работа; до неё интерфейс обязан
 * называть положение вещей, а не молчать о нём.
 */
function EditBookingForm({
  slug,
  booking,
  services,
  members,
  onSubmit,
  onCancel,
}: {
  slug: string;
  booking: Booking;
  services: Service[];
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
    <form onSubmit={handleSubmit} className="col" style={{ gap: 16 }} id="edit-booking-form">
      {/* Кто и что — первой строкой, как в артборде: панель открывают, глядя
          на строку списка, и убедиться, что открылась нужная запись, человек
          должен сразу. */}
      <div className="row" style={{ gap: 12 }}>
        <span
          className="avatar"
          style={{ width: 44, height: 44, fontSize: 17, ...avatarTint(booking.id) }}
        >
          {initials(booking.guestName ?? '?')}
        </span>
        <div className="col" style={{ flex: 1, gap: 1, minWidth: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>
            {booking.guestName ?? t.admin.noName}
          </span>
          {booking.guestPhone ? (
            <a className="t-meta" href={`tel:${booking.guestPhone}`}>
              {formatPhone(booking.guestPhone)}
            </a>
          ) : null}
        </div>
        {booking.guestPhone ? (
          <a
            className="btn btn-secondary btn-icon"
            href={`tel:${booking.guestPhone}`}
            aria-label={t.bookings.callClient}
          >
            <Icon name="phone" className="ico-18" />
          </a>
        ) : null}
      </div>

      {/* Четыре факта о визите — тем же составом, что в макете: что, сколько,
          в каком состоянии и откуда пришло. */}
      <div className="booking-facts">
        <div className="col">
          <span className="t-label">{t.bookings.colService}</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {booking.items.map((item) => item.serviceNameSnapshot).join(' + ') ||
              t.admin.noServices}
          </span>
        </div>
        <div className="col">
          <span className="t-label">{t.clients.colDuration}</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {formatDuration(totalMinutes, {
              hoursShort: t.common.hoursShort,
              minutesShort: t.common.minutesShort,
            })}
            {' · '}
            {formatPrice(totalAmount, currency, locale)}
          </span>
        </div>
        <div className="col">
          <span className="t-label">{t.admin.colStatus}</span>
          <span>
            <span className={`badge ${statusBadgeClass(statusMeta[booking.status].tone)}`}>
              <span className="dot" />
              {statusMeta[booking.status].label}
            </span>
          </span>
        </div>
        <div className="col">
          <span className="t-label">{t.bookings.colCreated}</span>
          <span style={{ fontSize: 13.5 }}>
            {formatDateTime(booking.createdAt, locale, undefined, timeZone)}
          </span>
        </div>
      </div>

      {/* Перенос — до состава: вопрос «а можно на четверг» звучит чаще, чем
          «поменяйте телефон». Своей кнопкой, а не частью общего «Сохранить»:
          перенос двигает окна календаря и может не состояться из-за чужой
          записи, а смена имени — нет. */}
      <RescheduleBlock slug={slug} booking={booking} members={members} />

      <div className="col" style={{ gap: 8 }}>
        <span className="t-label">{t.bookings.editServices}</span>
        {/* Переключатель на строку, а не сетка «таблеток»: услуг в визите может
            быть несколько, и это выбор «да/нет» по каждой. */}
        <div className="col" style={{ gap: 6 }}>
          {rows.map((service) => (
            <label key={service.id} className="booking-service">
              <span className="col" style={{ gap: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{service.name}</span>
                <span className="t-meta tnum" style={{ fontSize: 12.5 }}>
                  {formatPrice(service.priceAmount, service.priceCurrency, locale)} ·{' '}
                  {formatDuration(service.durationMinutes, {
                    hoursShort: t.common.hoursShort,
                    minutesShort: t.common.minutesShort,
                  })}
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
        <span className="t-meta">
          <b style={{ color: 'var(--ink)' }}>{formatPrice(totalAmount, currency, locale)}</b> ·{' '}
          {formatDuration(totalMinutes, {
            hoursShort: t.common.hoursShort,
            minutesShort: t.common.minutesShort,
          })}
        </span>
      </div>

      <div className="settings-pair">
        <div className="field">
          <label className="label" htmlFor="edit-guest-name">
            {t.bookings.clientName}
          </label>
          <input
            className="input"
            id="edit-guest-name"
            required
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="edit-guest-phone">
            {t.bookings.phone}
          </label>
          <input
            className="input"
            id="edit-guest-phone"
            type="tel"
            value={guestPhone}
            onChange={(event) => setGuestPhone(event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="edit-guest-instagram">
          Instagram
        </label>
        <input
          className="input"
          id="edit-guest-instagram"
          value={guestInstagram}
          onChange={(event) => setGuestInstagram(event.target.value)}
          placeholder="username"
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="edit-notes">
          {t.bookings.note}
        </label>
        <textarea
          className="input textarea"
          id="edit-notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      {error ? <FieldError>{error}</FieldError> : null}

      {onCancel ? (
        <div className="row booking-danger">
          <button type="button" className="btn btn-danger btn-sm" onClick={onCancel}>
            <Icon name="x" className="ico-18" />
            <span>{t.bookings.cancelBooking}</span>
          </button>
          <span className="t-meta" style={{ fontSize: 12 }}>
            {t.bookings.asksConfirmation}
          </span>
        </div>
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
  /** К кому можно перевести визит при переносе; пусто — вопроса нет. */
  members?: { id: string; name: string }[];
  onSubmit: (input: UpdateBookingInput) => Promise<void>;
  submitting: boolean;
  onCancel?: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();

  return (
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.bookings.editTitle}
      subtitle={
        booking
          ? `${booking.guestName ?? t.admin.noName} · ${formatDateTime(
              booking.startsAt,
              locale,
              { weekday: 'short', day: 'numeric', month: 'short' },
              timeZone,
            )}`
          : undefined
      }
      closeLabel={t.common.close}
      footer={
        /* Без единой услуги визит не имеет длительности, а значит и времени,
           которое занимает: сервер такой состав отклонит, и кнопка говорит об
           этом заранее, а не после отправки. */
        <button
          type="submit"
          form="edit-booking-form"
          className="btn btn-primary"
          disabled={submitting}
        >
          <span>{submitting ? t.common.saving : t.common.save}</span>
        </button>
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
          members={members}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      ) : null}
    </SideSheet>
  );
}
