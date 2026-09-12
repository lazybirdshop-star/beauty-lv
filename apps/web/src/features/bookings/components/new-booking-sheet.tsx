'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { formatDuration, formatPhone, formatPrice, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { matchesSearch, searchableDigits } from '@/lib/list-search';
import { useTimeZone } from '@/lib/timezone';
import { describeApiError } from '@/lib/describe-api-error';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { cn } from '@/lib/utils';

import { groupSlotsByDay } from '../../scheduling/group-by-day';
import type { Client } from '../../clients/types';
import type { Service } from '../../services/types';
import type { PublishedSlot } from '../../scheduling/types';
import { joinLocal } from '../local-time';
import type { CreateBookingInput } from '../types';
import { ClientStrip } from './client-strip';

/** Сколько дней с окнами показано до нажатия «показать ещё». */
const FIRST_DAYS = 3;
/** Сколько добавляет одно нажатие. */
const MORE_DAYS = 7;

interface NewBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableSlots: PublishedSlot[];
  services: Service[];
  onSubmit: (input: CreateBookingInput) => Promise<void>;
  submitting: boolean;
  /**
   * Кого записываем, если это уже известно, — карточка клиента открывает эту
   * же форму. Имя и телефон подставляются, но остаются полем: мастер вправе
   * поправить номер, который ей продиктовали заново.
   */
  guest?: { name: string; phone: string };
  /** Адресная книга — чтобы записать своего, не набирая его заново. */
  clients?: Client[];
  initialDateTime?: string;
  /**
   * Кто работает — для выбора мастера в салоне. Один человек или ничего не
   * передано — вопроса «к кому» нет: соло-мастеру его не задают.
   */
  members?: BookingMember[];
  /** К кому записываем: колонка календаря, по которой нажали, или сама вошедшая. */
  memberId?: string;
  /** Адрес кабинета — для ссылки на карточку клиента в полоске. */
  slug?: string;
}

export interface BookingMember {
  id: string;
  name: string;
}

/**
 * Форма записи — Design System V2 §7: кто → что → когда (approved R-7).
 *
 * Клиент — поле с подсказками по книге (тот же матчер, что у ⌘K); выбранный
 * встаёт полоской клиента с «Изменить», набранный, которого нет в книге, —
 * новый человек. Услуга — из прайса, под ней бегущий итог «1 ч 30 · 45 €» на
 * розовой полосе. Время — окна по дням пилюлями (выбранное поднимается) или
 * своё время. На кнопке — посчитанный конец визита: «Создать · 14:00–15:45».
 *
 * Логика записи не менялась: одно окно или названный момент, одна услуга,
 * имя от двух символов, телефон и Instagram как были.
 */
function NewBookingForm({
  availableSlots,
  services,
  onSubmit,
  submitting,
  guest,
  clients = [],
  initialDateTime,
  members = [],
  memberId: initialMemberId,
  slug,
  formId,
  onSummary,
}: Omit<NewBookingSheetProps, 'open' | 'onOpenChange'> & {
  formId: string;
  /** Что стоит на кнопке футера и можно ли её нажать. */
  onSummary: (summary: { label: string; canSubmit: boolean }) => void;
}) {
  const t = useT();
  const validate = useLocalizedValidation();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const [memberId, setMemberId] = useState(initialMemberId ?? '');
  /* Окна — только выбранного мастера. У владелицы салона в списке окна всех, и
     время Юлии, предложенное к записи к Анне, заняло бы чужой день. Без
     названного мастера фильтра нет: так форма ведёт себя вне кабинета. */
  const memberSlots = useMemo(
    () =>
      memberId
        ? availableSlots.filter((slot) => slot.organizationMemberId === memberId)
        : availableSlots,
    [availableSlots, memberId],
  );
  const [slotId, setSlotId] = useState(memberSlots[0]?.id ?? '');
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  /* Grouped by day: 25 published windows used to arrive as one flat sheet of
     ~37 pills — the audit's worst decision point. A day heading turns the
     scan from «which pill» into «which day, then which time». */
  const slotDays = useMemo(() => groupSlotsByDay(memberSlots, locale), [memberSlots, locale]);

  /* Другой мастер — другие окна: выбранное время чужого дня сбрасывается на
     первое окно нового, а не остаётся невидимым выбором. */
  function pickMember(id: string) {
    setMemberId(id);
    setSlotId(availableSlots.find((slot) => slot.organizationMemberId === id)?.id ?? '');
    setDaysShown(FIRST_DAYS);
  }
  /* Someone wrote asking for a time she never opened; she should not have to
     publish a window to the whole internet just to write that person in. */
  const [mode, setMode] = useState<'slot' | 'custom'>(initialDateTime ? 'custom' : 'slot');
  const [customAt, setCustomAt] = useState(initialDateTime ?? '');
  const [client, setClient] = useState<Client | null>(null);
  const [guestName, setGuestName] = useState(guest?.name ?? '');
  const [guestPhone, setGuestPhone] = useState(guest?.phone ?? '+371 ');

  /* Выбор из книги заполняет поля, а не заменяет их: номер, продиктованный
     заново, мастер вправе поправить прямо здесь, ничего не отменяя. */
  function pickClient(picked: Client) {
    setClient(picked);
    setGuestName(picked.fullName);
    setGuestPhone(picked.phone);
  }

  /* Сколько дней с окнами показывать сразу: записывают обычно на ближайшие. */
  const [daysShown, setDaysShown] = useState(FIRST_DAYS);
  const [guestInstagram, setGuestInstagram] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const service = services.find((item) => item.id === serviceId) ?? null;
  const minutes = service?.durationMinutes ?? 0;
  const startsAtIso =
    mode === 'slot'
      ? (memberSlots.find((slot) => slot.id === slotId)?.startsAt ?? null)
      : customAt.includes('T')
        ? joinLocal(customAt.split('T')[0]!, customAt.split('T')[1]!, timeZone)
        : null;
  const endsAtIso =
    startsAtIso && minutes
      ? new Date(new Date(startsAtIso).getTime() + minutes * 60_000).toISOString()
      : null;

  const canSubmit =
    (mode === 'slot' ? Boolean(slotId) : Boolean(customAt)) &&
    Boolean(serviceId) &&
    guestName.trim().length >= 2;

  const label = submitting
    ? t.bookings.creating
    : startsAtIso && endsAtIso
      ? `${t.bookings.create} · ${formatTime(startsAtIso, locale, timeZone)}–${formatTime(endsAtIso, locale, timeZone)}`
      : t.bookings.create;
  /* Футер живёт вне формы (закреплён под прокруткой): подпись и доступность
     кнопки он узнаёт от формы. */
  useEffect(() => {
    onSummary({ label, canSubmit });
  }, [label, canSubmit, onSummary]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!canSubmit) return;
    try {
      await onSubmit({
        ...(mode === 'slot'
          ? { publishedSlotId: slotId }
          : {
              startsAt: joinLocal(customAt.split('T')[0]!, customAt.split('T')[1]!, timeZone)!,
              /* Названный час открывается у того, к кому записывают; окно
                 своего мастера называет само, и второй ответ не нужен. */
              organizationMemberId: memberId || undefined,
            }),
        serviceIds: [serviceId],
        guestName,
        guestPhone,
        guestInstagram: guestInstagram.trim() || undefined,
        notes,
      });
    } catch (submitError) {
      /* Сервер различает «окно только что заняли», «время уже прошло» и «не
         хватает времени подряд» — свести их в одну строку значило бы гонять
         мастера в то же окно снова и снова. */
      setError(describeApiError(submitError, t, t.bookings.createFailed));
    }
  }

  if (services.length === 0) {
    return <p className="type-meta">{t.bookings.needService}</p>;
  }

  const matchClient = (item: Client, query: string) =>
    matchesSearch(query, [item.fullName]) ||
    (searchableDigits(query).length >= 3 &&
      searchableDigits(item.phone).includes(searchableDigits(query)));

  return (
    <form ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-5" id={formId}>
      {/* «К кому» — раньше «когда»: время у каждого мастера своё, и список
          окон отвечает только после того, как назван человек. */}
      {members.length > 1 ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="booking-member" className="type-meta">
            {t.schedule.member}
          </label>
          <Select
            id="booking-member"
            value={memberId}
            onChange={(event) => pickMember(event.target.value)}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {/* Кто придёт — первым вопросом (approved R-7), с ответом из книги. */}
      <section className="panel-section" aria-label={t.bookings.sectionClient}>
        <h3 className="type-meta">{t.bookings.sectionClient}</h3>
        {client ? (
          <ClientStrip
            slug={slug ?? ''}
            client={client}
            name={client.fullName}
            phone={client.phone}
            action={
              <Button
                type="button"
                variant="ghost"
                size="pill"
                onClick={() => {
                  setClient(null);
                  setGuestName('');
                  setGuestPhone('+371 ');
                }}
              >
                {t.bookings.changeClient}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor="booking-guest-name" className="type-meta">
              {t.bookings.clientName}
            </label>
            <Combobox<Client>
              id="booking-guest-name"
              required
              placeholder={t.bookings.clientSearch}
              items={clients}
              getKey={(item) => item.id}
              getLabel={(item) => item.fullName}
              match={matchClient}
              renderItem={(item) => (
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="truncate">{item.fullName}</span>
                  <span className="type-meta tnum">{formatPhone(item.phone)}</span>
                </span>
              )}
              value={guestName}
              onValueChange={setGuestName}
              onSelect={pickClient}
              fallthrough={
                guestName.trim().length >= 2
                  ? {
                      label: fmt(t.bookings.createNewClient, { name: guestName.trim() }),
                      onSelect: () => setClient(null),
                    }
                  : null
              }
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="booking-guest-phone" className="type-meta">
              {t.bookings.phone}
            </label>
            <Input
              id="booking-guest-phone"
              type="tel"
              value={guestPhone}
              onChange={(event) => setGuestPhone(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="booking-guest-instagram" className="type-meta">
              Instagram
            </label>
            <Input
              id="booking-guest-instagram"
              value={guestInstagram}
              onChange={(event) => setGuestInstagram(event.target.value)}
              placeholder="username"
            />
          </div>
        </div>
      </section>

      <section className="panel-section" aria-label={t.bookings.sectionServices}>
        <h3 className="type-meta">{t.bookings.sectionServices}</h3>
        <div className="flex flex-col gap-2">
          <label htmlFor="booking-service" className="sr-only">
            {t.bookings.service}
          </label>
          {/* A native select, not a pill per service: with a dozen services the
              pill grid was most of the sheet's decision explosion, and the
              platform picker is the product's stated answer for long single
              choices (see Select's own rationale). */}
          <Select
            id="booking-service"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
          >
            {services.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        {/* Бегущий итог — то, ради чего выбирают услугу: длительность решает,
            какое окно подходит, цена — что сказать клиенту. */}
        {service ? (
          <div className="booking-total">
            <span className="type-meta">{t.bookings.total}</span>
            <span className="type-figure type-figure--total booking-total__figure">
              {formatDuration(service.durationMinutes, {
                hoursShort: t.common.hoursShort,
                minutesShort: t.common.minutesShort,
              })}
              {service.priceCurrency
                ? ` · ${formatPrice(service.priceAmount, service.priceCurrency, locale)}`
                : ''}
            </span>
          </div>
        ) : null}
      </section>

      <section className="panel-section" aria-label={t.bookings.sectionTime}>
        <h3 className="type-meta">{t.bookings.when}</h3>

        <Tabs value={mode} onValueChange={(next) => setMode(next as 'slot' | 'custom')}>
          <TabsList aria-label={t.bookings.when} className="w-full">
            <TabsTrigger value="slot" className="flex-1 justify-center">
              {t.bookings.fromSlots}
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex-1 justify-center">
              {t.bookings.customTime}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === 'custom' ? (
          <div className="flex flex-col gap-2">
            <Input
              type="datetime-local"
              aria-label={t.bookings.customTime}
              value={customAt}
              onChange={(event) => setCustomAt(event.target.value)}
              className="w-full"
            />
            <span className="type-meta">{t.bookings.customTimeHint}</span>
          </div>
        ) : memberSlots.length === 0 ? (
          <p className="type-meta">{t.bookings.noSlots}</p>
        ) : null}

        <div className={cn('flex flex-col gap-4', mode === 'custom' && 'hidden')}>
          {slotDays.slice(0, daysShown).map((day) => (
            <div key={day.dateKey} className="flex flex-col gap-2">
              <p className="type-meta">
                {day.weekdayShort}, {day.dayNumber} {day.monthShort}
              </p>
              <div className="flex flex-wrap gap-2">
                {day.slots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    aria-pressed={slot.id === slotId}
                    data-selected={slot.id === slotId ? 'true' : undefined}
                    onClick={() => setSlotId(slot.id)}
                    className="window-pill"
                  >
                    {formatTime(slot.startsAt, locale, timeZone)}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {slotDays.length > daysShown ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setDaysShown((shown) => shown + MORE_DAYS)}
            >
              {fmt(t.common.showMore, {
                count: Math.min(MORE_DAYS, slotDays.length - daysShown),
              })}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="panel-section">
        <div className="flex flex-col gap-2">
          <label htmlFor="booking-notes" className="type-meta">
            {t.bookings.note}
          </label>
          <Textarea
            id="booking-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <span className="type-meta">{t.bookings.noteHint}</span>
        </div>
      </section>

      {error ? <FieldError>{error}</FieldError> : null}
    </form>
  );
}

export function NewBookingSheet({
  open,
  onOpenChange,
  availableSlots,
  services,
  onSubmit,
  submitting,
  guest,
  clients,
  initialDateTime,
  members,
  memberId,
  slug,
}: NewBookingSheetProps) {
  const t = useT();
  const [summary, setSummary] = useState({ label: t.bookings.create, canSubmit: false });
  const formId = 'new-booking-form';

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.bookings.new}
      footer={
        services.length ? (
          <>
            <Button
              type="submit"
              form={formId}
              className="w-full"
              disabled={!summary.canSubmit || submitting}
            >
              {submitting ? t.bookings.creating : summary.label}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              {t.common.cancel}
            </Button>
          </>
        ) : undefined
      }
    >
      {open ? (
        <NewBookingForm
          key={`${guest?.phone ?? 'new'}:${memberId ?? ''}`}
          members={members}
          memberId={memberId}
          availableSlots={availableSlots}
          services={services}
          onSubmit={onSubmit}
          submitting={submitting}
          guest={guest}
          clients={clients}
          initialDateTime={initialDateTime}
          slug={slug}
          formId={formId}
          onSummary={setSummary}
        />
      ) : null}
    </Sheet>
  );
}
