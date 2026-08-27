'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  rememberGuestOnDevice,
  rememberVisitOnDevice,
} from '@/features/client-account/device-visits';
import { useKnownGuest } from '@/features/client-account/known-guest';
import { useDeviceGuest } from '@/features/client-account/use-device-memory';
import { ApiError } from '@/lib/api-error';
import { dayKey, timeKey } from '@/lib/format';
import { useLocale } from '@/lib/i18n';

import {
  createGuestBooking,
  fetchAvailability,
  type ApiSlot,
  type CreatedGuestBooking,
} from './api';
import {
  cartTotals,
  groupForPicker,
  suggestedAddons,
  type CartTotals,
  type ServiceGroup,
} from './booking-cart';
import type { PublicOrganization, PublicService, PublishedSlot, SlotDay } from './types';

export type BookingStep = 'services' | 'addons' | 'time' | 'contacts';

export type BookingFlowStatus = 'idle' | 'submitting' | 'done' | 'error' | 'blocked';

/**
 * Everything the confirmation screen needs, captured the moment the booking
 * is made — not read back off live state.
 *
 * The live state stops describing this booking the instant it succeeds: the
 * window it used disappears from the availability list, so `chosenSlot`
 * became null and the screen either vanished or fell back to asking for a
 * time all over again. A receipt is a fact about something that already
 * happened; it should not be derived from a schedule that has moved on.
 */
export interface BookingReceipt {
  booking: CreatedGuestBooking;
  guestName: string;
  /**
   * Дата и час визита теми же строками, что показала шторка, — в поясе
   * салона.
   *
   * Экран благодарности подписывал час, переводя `booking.startsAt` в пояс
   * устройства: человек выбирал 14:00, а прощались с ним «в 12:00». Час
   * визита — часть той же расписки, что и услуги с ценой, и снимается вместе
   * с ними, а не выводится заново из момента.
   */
  date: string;
  time: string;
  services: { id: string; name: string; priceAmountMinorUnits: number; priceCurrency: string }[];
  durationMinutes: number;
  priceMinorUnits: number;
  currency: string;
}

/**
 * The booking state machine, one copy for every world (BRAND_STYLE_ARCHITECTURE.md
 * §7.3 — the contract; §14.1 — how the two former copies were reconciled).
 *
 * Merge notes, by the audit's divergence list:
 * 1. Progress segments describe the actual route (`route` below) — the soft
 *    semantics, which the poster copy had already converged on; the indicator's
 *    shape stays each world's own.
 * 2. The `cancelled` race guard was identical in both copies — kept as is.
 * 3. The carried calendar window is trusted until the fetched list contradicts
 *    it — the soft semantics, already shared by both copies.
 * Everything else the copies differed in was presentation and stays in the
 * worlds (§1.1): field chrome, progress bar geometry, the success scene.
 */
export interface BookingFlow {
  state: {
    open: boolean;
    /** The step actually rendered: the raw pick corrected onto the route. */
    step: BookingStep;
    /** The route this visit actually walks — progress indicators read this. */
    route: BookingStep[];
    selectedIds: string[];
    activeDate: string | null;
    status: BookingFlowStatus;
    conflict: string;
    guest: { name: string; phone: string; instagram: string };
    /**
     * Чьи данные лежат в полях, если они не свои.
     *
     * `null` у гостя — и у вошедшего, который уже сказал, что записывает
     * другого человека. Экран показывает по этому полю строку «вы вошли
     * как…»: подставленное имя без объяснения выглядит как чужая сессия в
     * общем браузере.
     */
    knownGuest: { name: string } | null;
    receipt: BookingReceipt | null;
  };
  derived: {
    selectedServices: PublicService[];
    serviceGroups: ServiceGroup[];
    addons: PublicService[];
    totals: CartTotals;
    days: SlotDay[];
    /** The day the time step shows: the picked one, else the first with windows. */
    activeDay: SlotDay | null;
    loadingSlots: boolean;
    chosenSlot: PublishedSlot | null;
    /** The pick that survives the fetch: the tap if the list still holds it, else the carried window. */
    effectiveSlotId: string | null;
    canContinue: boolean;
    awaiting: boolean;
    /** What the forward button actually opens — its label names this step. */
    nextStep: BookingStep | null;
  };
  actions: {
    toggleService(id: string): void;
    pickDate(date: string): void;
    pickSlot(slotId: string): void;
    setGuestName(value: string): void;
    setGuestPhone(value: string): void;
    setGuestInstagram(value: string): void;
    /** Записать не себя: поля очищаются, визит останется гостевым. */
    bookForSomeoneElse(): void;
    goNext(): void;
    goBack(): void;
    submit(): Promise<void>;
    /** Closes the sheet; the state resets after the close animation, not before. */
    close(): void;
  };
}

export interface UseBookingFlowArgs {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: PublicOrganization;
  /** Tapped in the calendar, if any — offered back at the time step when the visit still fits it. */
  preferredSlot: PublishedSlot | null;
  /** Services chosen before the sheet opened — from a card on the prices page. */
  initialServiceIds?: string[];
  /** A window was chosen in the calendar before the action was pressed. */
  slotChosen?: boolean;
  /**
   * Запись состоялась: окно, с которого визит начался, и сколько времени он
   * занял. Расписание гасит по этому не одно окно, а весь отрезок.
   */
  onBooked: (booked: { startsAt: string; durationMinutes: number }) => void;
}

const DAY_LABEL_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

/** Латвия — единственный рынок продукта; код страны экономит восемь нажатий. */
const DEFAULT_PHONE_PREFIX = '+371 ';

/**
 * Server order is chronological, so days and their windows come out sorted for
 * free.
 *
 * Сутки и часы — салона, а не браузера. Календарь на той же странице собирает
 * их сервером, шторка — здесь, и пока обе стороны считали `getHours()`, одно
 * и то же окно называлось в них разным временем: страница часами машины
 * Vercel, шторка — часами телефона в поездке. Клиент, ткнувший в «10:00» на
 * календаре, попадал в шторку, где этого часа нет.
 */
function groupByDay(slots: ApiSlot[], locale: string, timeZone: string): SlotDay[] {
  const DAY_LABEL = new Intl.DateTimeFormat(locale, { ...DAY_LABEL_OPTS, timeZone });
  const byDate = new Map<string, SlotDay>();

  for (const slot of slots) {
    const key = dayKey(slot.startsAt, timeZone);
    const day = byDate.get(key) ?? {
      date: key,
      label: DAY_LABEL.format(new Date(slot.startsAt)),
      slots: [],
    };
    day.slots.push({
      id: slot.id,
      date: key,
      time: timeKey(slot.startsAt, timeZone),
      iso: slot.startsAt,
      status: slot.status,
    });
    byDate.set(key, day);
  }

  return [...byDate.values()];
}

/**
 * The booking flow: services → suggestions → time → contacts.
 *
 * Services come before time, not after, because the length of the visit
 * decides which windows can even be offered — a two-hour chain must never be
 * shown a start with somebody booked an hour into it. The schedule is
 * therefore fetched only once the cart exists.
 */
export function useBookingFlow({
  open,
  onOpenChange,
  org,
  preferredSlot,
  initialServiceIds,
  slotChosen = false,
  onBooked,
}: UseBookingFlowArgs): BookingFlow {
  const locale = useLocale();

  const [step, setStep] = useState<BookingStep>(initialServiceIds?.length ? 'addons' : 'services');
  const [selectedIds, setSelectedIds] = useState<string[]>(initialServiceIds ?? []);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  // Stored together with the length it was fetched for, so "is this list
  // current?" is a comparison instead of a second loading flag that has to
  // be kept in step with it.
  const [loaded, setLoaded] = useState<{ duration: number; days: SlotDay[] } | null>(null);

  /*
   * Вошедшего человека форма не переспрашивает: имя и телефон он уже давал —
   * и не абстрактному профилю, а в прошлой записи. Поля остаются обычными,
   * редактируемыми: подставленное — предложение, а не приговор.
   */
  /*
   * Два источника одного знания, и оба — не про этого мастера, а про этого
   * человека: сессия кабинета и память самого браузера. Записывавшийся с
   * этого телефона вводил имя и номер и без всякого аккаунта; заставлять его
   * набирать их снова значит делать вид, что первого раза не было.
   *
   * Сессия старше памяти устройства: телефоном могли попользоваться, а вход
   * человек проделал сам.
   */
  const signedInGuest = useKnownGuest();
  const rememberedGuest = useDeviceGuest();
  const known = signedInGuest ?? rememberedGuest;

  /*
   * Поля не копируют узнанное в состояние, а показывают его, пока человек не
   * набрал своё: `null` — «не трогал». Копия завелась бы раньше, чем браузер
   * успел ответить, и подстановка либо не случилась бы вовсе, либо затёрла
   * бы уже набранное.
   */
  const [typedName, setTypedName] = useState<string | null>(null);
  const [typedPhone, setTypedPhone] = useState<string | null>(null);
  const [ownGuest, setOwnGuest] = useState(false);

  const usingKnownGuest = known !== null && !ownGuest;
  const name = typedName ?? (usingKnownGuest ? known.fullName : '');
  const phone =
    typedPhone ?? (usingKnownGuest ? (known.phone ?? DEFAULT_PHONE_PREFIX) : DEFAULT_PHONE_PREFIX);
  const setName = setTypedName;
  const setPhone = setTypedPhone;
  const [instagram, setInstagram] = useState('');
  const [conflict, setConflict] = useState('');
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);
  const [status, setStatus] = useState<BookingFlowStatus>('idle');

  const selectedServices = useMemo(
    () => org.services.filter((service) => selectedIds.includes(service.id)),
    [org.services, selectedIds],
  );
  const totals = cartTotals(selectedServices);
  const serviceGroups = useMemo(
    () => groupForPicker(org.services, org.serviceCategories),
    [org.services, org.serviceCategories],
  );
  const addons = useMemo(() => suggestedAddons(org, selectedIds), [org, selectedIds]);

  const fresh = loaded?.duration === totals.durationMinutes;
  const days = fresh ? loaded.days : [];

  /*
   * The window list depends on the cart, so it is fetched when the time step
   * opens rather than up front. `cancelled` guards the race where the client
   * steps back, changes the cart and returns before the first response lands
   * — without it the older, longer-duration answer could overwrite the newer
   * one.
   */
  useEffect(() => {
    /* Fetched as soon as there is a cart, not when a particular step opens.
       Gating it on the step meant the list was still missing on routes that
       reach the schedule without passing through that step, and an empty list
       renders as "no free time" — which is a different claim entirely. */
    if (!open || totals.durationMinutes === 0) return;
    if (loaded?.duration === totals.durationMinutes) return;

    let cancelled = false;
    const duration = totals.durationMinutes;

    fetchAvailability(org.slug, duration)
      .then((slots) => {
        if (!cancelled) setLoaded({ duration, days: groupByDay(slots, locale, org.timeZone) });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ duration, days: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [open, totals.durationMinutes, org.slug, org.timeZone, loaded?.duration, locale]);

  /*
   * The chosen day and window are derived, never synced through an effect.
   * A cart change reshuffles the list underneath them, and re-deriving is
   * what keeps a stale id from surviving into the request.
   */
  const day = days.find((item) => item.date === activeDate) ?? days[0] ?? null;
  const allSlots = days.flatMap((item) => item.slots);
  // The window tapped in the calendar is only a preference: a longer cart may
  // no longer fit it, and it is dropped rather than silently booked.
  const effectiveSlotId = allSlots.some((slot) => slot.id === slotId)
    ? slotId
    : (allSlots.find((slot) => slot.id === preferredSlot?.id)?.id ?? null);
  const chosenSlot =
    allSlots.find((slot) => slot.id === effectiveSlotId) ?? (slotChosen ? preferredSlot : null);

  /*
   * The route depends on where the visitor came in: from a service card the
   * services step is already answered, from a window in the calendar the time
   * step is. Nobody is asked twice for what they already chose.
   *
   * Time returns to the route even on the calendar path once the chosen window
   * can no longer hold the cart — telling someone at the contacts step that
   * their time stopped working is worse than asking again.
   *
   * The window list is only fetched once the time step opens, so `chosenSlot`
   * is null at the start and asking it whether the time is settled was a
   * circular question — the step put itself back into the route and the
   * visitor was asked for a time they had just picked.
   *
   * The window carried in from the calendar is trusted until the fetched list
   * actually contradicts it, which is the only moment we learn the cart has
   * outgrown it.
   */
  const carriedSlot = slotChosen ? preferredSlot : null;
  const timeSatisfied =
    carriedSlot !== null && (!fresh || allSlots.some((slot) => slot.id === carriedSlot.id));
  const steps: BookingStep[] = [
    ...(initialServiceIds?.length ? [] : (['services'] as BookingStep[])),
    'addons',
    ...(timeSatisfied ? [] : (['time'] as BookingStep[])),
    'contacts',
  ];
  /* Navigation walks that route rather than a fixed ladder, so a skipped step
     cannot be reached by pressing Next twice. */
  const route = steps.filter((s) => s !== 'addons' || addons.length > 0);
  /* The opening step is guessed at mount, before `addons` is known. If that
     guess is not on the route — a service with no suggestions — fall through
     to the first step that is, instead of rendering an empty offer. */
  const current = route.includes(step) ? step : (route[0] ?? 'contacts');
  /* Tied to `step` this was false while the route had already fallen through
     to the time step, so an empty list rendered as "no time available" before
     the fetch had even landed — and it only showed on services with no
     suggestions, where nothing delays the arrival. */
  const loadingSlots = current === 'time' && !fresh;
  const nextStep = route[route.indexOf(current) + 1] ?? null;

  function toggleService(serviceId: string) {
    setSelectedIds((prev) =>
      prev.includes(serviceId) ? prev.filter((item) => item !== serviceId) : [...prev, serviceId],
    );
  }

  function reset() {
    setStep('services');
    setSelectedIds([]);
    setSlotId(null);
    setLoaded(null);
    setActiveDate(null);
    setConflict('');
    setStatus('idle');
    setTypedName(null);
    setTypedPhone(null);
    setOwnGuest(false);
    setInstagram('');
  }

  /*
   * Записывают не только себя: подруге, дочери, маме. Тогда визит остаётся
   * гостевым и в кабинет записавшего не попадает — иначе в «моих визитах»
   * оказался бы чужой визит, а его отмена стала бы отменой чужой записи.
   */
  function bookForSomeoneElse() {
    setOwnGuest(true);
    setTypedName(null);
    setTypedPhone(null);
    setInstagram('');
  }

  function close() {
    onOpenChange(false);
    // Cleared after the close animation so the sheet does not visibly rewind
    // to step one on its way out.
    window.setTimeout(reset, 200);
  }

  function goNext() {
    const i = route.indexOf(current);
    if (i >= 0 && i < route.length - 1) setStep(route[i + 1]!);
  }

  function goBack() {
    const i = route.indexOf(current);
    if (i > 0) setStep(route[i - 1]!);
  }

  async function submit() {
    if (!chosenSlot || selectedIds.length === 0) return;
    setStatus('submitting');
    try {
      const created = await createGuestBooking(org.slug, {
        publishedSlotId: chosenSlot.id,
        serviceIds: selectedIds,
        guestName: name.trim(),
        guestPhone: phone.trim(),
        guestInstagram: instagram.trim() || undefined,
      });
      /*
       * Устройство запоминает свою запись сразу — до всякой почты. С этого
       * телефона «мои визиты» откроются без письма и без единого действия, а
       * следующая запись не станет переспрашивать имя и номер.
       */
      rememberVisitOnDevice({
        token: created.publicToken,
        slug: org.slug,
        masterName: org.name,
        date: chosenSlot.date,
        time: chosenSlot.time,
        startsAt: created.startsAt,
      });
      rememberGuestOnDevice({ fullName: name.trim(), phone: phone.trim() });

      setReceipt({
        booking: created,
        guestName: name.trim(),
        date: chosenSlot.date,
        time: chosenSlot.time,
        services: selectedServices.map((service) => ({
          id: service.id,
          name: service.name,
          priceAmountMinorUnits: service.priceAmountMinorUnits,
          priceCurrency: service.priceCurrency,
        })),
        durationMinutes: totals.durationMinutes,
        priceMinorUnits: totals.priceMinorUnits,
        currency: totals.currency,
      });
      onBooked({ startsAt: created.startsAt, durationMinutes: totals.durationMinutes });
      setStatus('done');
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setStatus('blocked');
        return;
      }
      setConflict(error instanceof ApiError && error.status === 409 ? error.message : '');
      setStatus('error');
    }
  }

  const canContinue =
    current === 'services' || current === 'addons'
      ? selectedIds.length > 0
      : current === 'time'
        ? Boolean(chosenSlot)
        : name.trim().length >= 2 && phone.trim().length >= 8;

  return {
    state: {
      open,
      step: current,
      route,
      selectedIds,
      activeDate,
      status,
      conflict,
      guest: { name, phone, instagram },
      knownGuest: usingKnownGuest && known ? { name: known.fullName } : null,
      receipt,
    },
    derived: {
      selectedServices,
      serviceGroups,
      addons,
      totals,
      days,
      activeDay: day,
      loadingSlots,
      chosenSlot,
      effectiveSlotId,
      canContinue,
      awaiting: receipt?.booking.status === 'pending',
      nextStep,
    },
    actions: {
      toggleService,
      pickDate: setActiveDate,
      pickSlot: setSlotId,
      setGuestName: setName,
      setGuestPhone: setPhone,
      setGuestInstagram: setInstagram,
      bookForSomeoneElse,
      goNext,
      goBack,
      submit,
      close,
    },
  };
}
