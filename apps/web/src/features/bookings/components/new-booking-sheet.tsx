'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { SheetSection } from '@/components/ui/sheet-parts';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ClientFlagBadge } from '@/features/clients/components/client-flag-badge';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { avatarTint, initials } from '@/lib/avatar';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDayShort, formatDuration, formatPhone, formatPrice, formatTime } from '@/lib/format';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { matchesSearch, searchableDigits } from '@/lib/list-search';
import { useTimeZone } from '@/lib/timezone';

import type { Client } from '../../clients/types';
import { groupSlotsByDay } from '../../scheduling/group-by-day';
import type { PublishedSlot } from '../../scheduling/types';
import type { Service } from '../../services/types';
import { joinLocal } from '../local-time';
import type { CreateBookingInput } from '../types';

/** Сколько дней с окнами показано до нажатия «показать ещё». */
const FIRST_DAYS = 3;
/** Сколько добавляет одно нажатие. */
const MORE_DAYS = 7;
/** Сколько строк книги видно под поиском. */
const CLIENT_ROWS = 3;

interface NewBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableSlots: PublishedSlot[];
  services: Service[];
  onSubmit: (input: CreateBookingInput) => Promise<void>;
  submitting: boolean;
  /**
   * Кого записываем, если это уже известно, — карточка клиента открывает эту
   * же форму. Найденный в книге по телефону встаёт выбранным; не найденный —
   * новым клиентом с подставленными именем и телефоном.
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
  /** Адрес кабинета. */
  slug?: string;
}

export interface BookingMember {
  id: string;
  name: string;
}

/** Что показывает подвал: итог выбранного и можно ли создать запись. */
interface BookingSummary {
  canSubmit: boolean;
  total: string | null;
  duration: string | null;
}

/**
 * Форма записи — шторка `newBooking` прототипа «Кабинет 2026»: кто придёт →
 * услуги → мастер → когда → заметка; итог и «Создать запись» в подвале.
 *
 * Клиент — поиск по книге с тремя строками под ним и «Новый клиент» в конце;
 * выбранный встаёт строкой с «Изменить». Услуги — пилюлями с ценой, можно
 * несколько: визит длится их суммой. Время — окна выбранного мастера по дням
 * или своё время датой и часом.
 */
function NewBookingForm({
  availableSlots,
  services,
  onSubmit,
  guest,
  clients = [],
  initialDateTime,
  members = [],
  memberId: initialMemberId,
  formId,
  onSummary,
}: Omit<NewBookingSheetProps, 'open' | 'onOpenChange' | 'submitting' | 'slug'> & {
  formId: string;
  onSummary: (summary: BookingSummary) => void;
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
  const [serviceIds, setServiceIds] = useState<string[]>(() =>
    services[0] ? [services[0].id] : [],
  );
  /* Grouped by day: 25 published windows used to arrive as one flat sheet of
     ~37 pills — the audit's worst decision point. A day label turns the
     scan from «which pill» into «which day, then which time». */
  const slotDays = useMemo(
    () => groupSlotsByDay(memberSlots, locale, timeZone),
    [memberSlots, locale, timeZone],
  );
  const [daysShown, setDaysShown] = useState(FIRST_DAYS);

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
  const [customDate, setCustomDate] = useState(initialDateTime?.split('T')[0] ?? '');
  const [customTime, setCustomTime] = useState(initialDateTime?.split('T')[1] ?? '');
  const customAt = customDate && customTime ? `${customDate}T${customTime}` : '';

  /* Кто придёт: выбранный из книги, новый человек или ещё никто. Карточка
     клиента передаёт известного — он находится в книге по телефону. */
  const [client, setClient] = useState<Client | null>(() =>
    guest
      ? (clients.find((item) => searchableDigits(item.phone) === searchableDigits(guest.phone)) ??
        null)
      : null,
  );
  const [newClient, setNewClient] = useState(() => Boolean(guest) && !client);
  const [query, setQuery] = useState('');
  const [guestName, setGuestName] = useState(guest?.name ?? '');
  const [guestPhone, setGuestPhone] = useState(guest?.phone ?? '+371 ');
  const [guestInstagram, setGuestInstagram] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const units = { hoursShort: t.common.hoursShort, minutesShort: t.common.minutesShort };
  const picked = services.filter((item) => serviceIds.includes(item.id));
  const minutes = picked.reduce((sum, item) => sum + item.durationMinutes, 0);
  const currency = picked[0]?.priceCurrency;
  const total = currency
    ? formatPrice(
        picked.reduce((sum, item) => sum + item.priceAmount, 0),
        currency,
        locale,
      )
    : null;
  const duration = minutes ? formatDuration(minutes, units) : null;

  const canSubmit =
    (mode === 'slot' ? Boolean(slotId) : Boolean(customAt)) &&
    serviceIds.length > 0 &&
    (client !== null || (newClient && guestName.trim().length >= 2));

  /* Подвал живёт вне формы (закреплён под прокруткой): итог и доступность
     кнопки он узнаёт от формы. */
  useEffect(() => {
    onSummary({ canSubmit, total, duration });
  }, [canSubmit, total, duration, onSummary]);

  function toggleService(id: string) {
    setServiceIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  const matchClient = (item: Client, text: string) =>
    matchesSearch(text, [item.fullName]) ||
    (searchableDigits(text).length >= 3 &&
      searchableDigits(item.phone).includes(searchableDigits(text)));
  const clientRows = (
    query.trim() ? clients.filter((item) => matchClient(item, query)) : clients
  ).slice(0, CLIENT_ROWS);

  /* Набранное в поиске переезжает в поле нового клиента: цифры — в телефон,
     буквы — в имя. Второй раз диктовать не придётся. */
  function startNewClient() {
    const typed = query.trim();
    if (/^[\d\s+()-]{3,}$/.test(typed)) setGuestPhone(typed);
    else if (typed) setGuestName(typed);
    setNewClient(true);
  }

  function visitsLabel(item: Client) {
    const count = item.visitStats.totalBookings;
    return `${count} ${plural(locale, count, t.workspace.deskVisitForms)}`;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!canSubmit) return;
    try {
      await onSubmit({
        ...(mode === 'slot'
          ? { publishedSlotId: slotId }
          : {
              startsAt: joinLocal(customDate, customTime, timeZone)!,
              /* Названный час открывается у того, к кому записывают; окно
                 своего мастера называет само, и второй ответ не нужен. */
              organizationMemberId: memberId || undefined,
            }),
        serviceIds: picked.map((item) => item.id),
        guestName: client ? client.fullName : guestName,
        guestPhone: client ? client.phone : guestPhone,
        guestInstagram: client ? undefined : guestInstagram.trim() || undefined,
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

  /* «ср 16 сен» — сутки салона, как у всех дат кабинета. */
  const dayLabel = (day: (typeof slotDays)[number]) =>
    formatDayShort(day.slots[0]!.startsAt, locale, timeZone);
  const slotChips = (day: (typeof slotDays)[number]) =>
    day.slots.map((slot) => (
      <button
        key={slot.id}
        type="button"
        className="pick-chip"
        aria-pressed={slot.id === slotId}
        onClick={() => setSlotId(slot.id)}
      >
        {formatTime(slot.startsAt, locale, timeZone)}
      </button>
    ));

  return (
    <form ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-6" id={formId}>
      <SheetSection title={t.bookings.sectionWho}>
        {client ? (
          <div className="client-picked">
            <span className="list-avatar" style={avatarTint(client.id)} aria-hidden="true">
              {initials(client.fullName)}
            </span>
            <span className="client-picked__text">
              <b>{client.fullName}</b>
              <span className="tnum">
                {formatPhone(client.phone)} · {visitsLabel(client)}
              </span>
            </span>
            <ClientFlagBadge flag={client.flag} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setClient(null);
                setQuery('');
              }}
            >
              {t.bookings.changeClient}
            </Button>
          </div>
        ) : newClient ? (
          <>
            <Field id="booking-guest-name" label={t.bookings.clientName}>
              <Input
                id="booking-guest-name"
                required
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
              />
            </Field>
            <div className="form-grid">
              <Field id="booking-guest-phone" label={t.bookings.phone}>
                <Input
                  id="booking-guest-phone"
                  type="tel"
                  value={guestPhone}
                  onChange={(event) => setGuestPhone(event.target.value)}
                />
              </Field>
              <Field id="booking-guest-instagram" label="Instagram">
                <Input
                  id="booking-guest-instagram"
                  value={guestInstagram}
                  onChange={(event) => setGuestInstagram(event.target.value)}
                  placeholder="username"
                />
              </Field>
            </div>
            {clients.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => setNewClient(false)}
              >
                {t.bookings.findInBook}
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <label className="panel-search sheet-search">
              <Icon name="search" className="ico-18" />
              <input
                className="field-control panel-search__input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.bookings.clientSearch}
                aria-label={t.bookings.clientSearch}
              />
            </label>
            <div className="pick-list">
              {clientRows.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="client-pick"
                  onClick={() => setClient(item)}
                >
                  <span className="list-avatar" style={avatarTint(item.id)} aria-hidden="true">
                    {initials(item.fullName)}
                  </span>
                  <span className="client-pick__text">
                    <b>{item.fullName}</b>
                    <span className="tnum">
                      {formatPhone(item.phone)} · {visitsLabel(item)}
                    </span>
                  </span>
                  <ClientFlagBadge flag={item.flag} />
                </button>
              ))}
              <button
                type="button"
                className="client-pick client-pick--new"
                onClick={startNewClient}
              >
                <span>
                  {query.trim().length >= 2 && !/\d/.test(query)
                    ? fmt(t.bookings.createNewClient, { name: query.trim() })
                    : t.bookings.newClient}
                </span>
              </button>
            </div>
          </>
        )}
      </SheetSection>

      <SheetSection title={t.bookings.sectionServices}>
        <div className="pick-chips" role="group" aria-label={t.bookings.sectionServices}>
          {services.map((item) => (
            <button
              key={item.id}
              type="button"
              className="pick-chip"
              aria-pressed={serviceIds.includes(item.id)}
              onClick={() => toggleService(item.id)}
            >
              {item.name}
              {item.priceCurrency ? (
                <span className="pick-chip__meta">
                  {' '}
                  · {formatPrice(item.priceAmount, item.priceCurrency, locale)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </SheetSection>

      {/* «К кому» — до «когда»: время у каждого мастера своё, и список окон
          отвечает только после того, как назван человек. */}
      {members.length > 1 ? (
        <Field id="booking-member" label={t.schedule.member}>
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
        </Field>
      ) : null}

      <SheetSection title={t.bookings.when}>
        <Tabs value={mode} onValueChange={(next) => setMode(next as 'slot' | 'custom')}>
          <TabsList aria-label={t.bookings.when} className="sheet-tabs">
            <TabsTrigger value="slot">{t.bookings.fromSlots}</TabsTrigger>
            <TabsTrigger value="custom">{t.bookings.customTime}</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === 'custom' ? (
          <>
            <div className="form-grid">
              <Field id="booking-date" label={t.schedule.date}>
                <Input
                  id="booking-date"
                  type="date"
                  value={customDate}
                  onChange={(event) => setCustomDate(event.target.value)}
                />
              </Field>
              <Field id="booking-time" label={t.schedule.time}>
                <Input
                  id="booking-time"
                  type="time"
                  value={customTime}
                  onChange={(event) => setCustomTime(event.target.value)}
                />
              </Field>
            </div>
            <p className="form-field__hint">{t.bookings.customTimeHint}</p>
          </>
        ) : slotDays.length === 0 ? (
          <p className="form-field__hint">{t.bookings.noSlots}</p>
        ) : (
          <>
            {slotDays.slice(0, daysShown).map((day, index) =>
              index === 0 ? (
                <div key={day.dateKey} className="flex flex-col gap-2">
                  <p className="form-field__hint">
                    {dayLabel(day)}
                    {duration ? ` · ${fmt(t.bookings.needInRow, { duration })}` : ''}
                  </p>
                  <div className="pick-chips">{slotChips(day)}</div>
                </div>
              ) : (
                <div key={day.dateKey} className="slot-day">
                  <span className="slot-day__label">{dayLabel(day)}</span>
                  {slotChips(day)}
                </div>
              ),
            )}

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
          </>
        )}
      </SheetSection>

      <SheetSection title={t.bookings.note}>
        <Textarea
          id="booking-notes"
          rows={2}
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
}: NewBookingSheetProps) {
  const t = useT();
  const [summary, setSummary] = useState<BookingSummary>({
    canSubmit: false,
    total: null,
    duration: null,
  });
  const onSummary = useCallback((next: BookingSummary) => setSummary(next), []);
  const formId = 'new-booking-form';

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.bookings.new}
      description={t.bookings.newSheetHint}
      footer={
        services.length ? (
          <>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            {summary.total ? (
              <div className="sheet-total">
                <span>{t.bookings.total}</span>
                <b className="sheet-total__sum tnum">{summary.total}</b>
                {summary.duration ? <span>· {summary.duration}</span> : null}
              </div>
            ) : null}
            <Button type="submit" form={formId} disabled={!summary.canSubmit || submitting}>
              {submitting ? t.bookings.creating : t.bookings.create}
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
          guest={guest}
          clients={clients}
          initialDateTime={initialDateTime}
          formId={formId}
          onSummary={onSummary}
        />
      ) : null}
    </Sheet>
  );
}
