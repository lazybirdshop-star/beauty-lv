'use client';

import { ClientFlagBadge } from '@/features/clients/components/client-flag-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardLabel } from '@/components/ui/card';
import { formatPrice, formatTime } from '@/lib/format';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Sheet } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';
import { fmt, plural, useLocale, useT } from '@/lib/i18n';
import { ClientDetailSheet } from '@/features/clients/components/client-detail-sheet';
import { getClientBookings, getClientVisitStats } from '@/features/clients/visit-stats';
import type { Client } from '@/features/clients/types';

import { updateBookingStatus } from '../../bookings/api';
import { getBookingStatusMeta } from '../../bookings/status-meta';
import type { Booking, BookingStatus } from '../../bookings/types';

import { DayRail, type RailHour } from './day-rail';

function formatToday(locale: string, timeZone: string): string {
  const formatted = new Date().toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    timeZone,
  });
  /* Sentence case in JS, not CSS: `capitalize` uppercases every word, and
     «Воскресенье, 10 Августа» is wrong in Russian — only the first letter
     of the line takes the capital. */
  return formatted.charAt(0).toLocaleUpperCase(locale) + formatted.slice(1);
}

/**
 * Час берётся из той же строки, которую видит мастер, а не из `getHours()`:
 * `formatTime` уже привела время к 24-часовому виду локали, поэтому шкала и
 * строка списка не могут разойтись между собой ни на час.
 */
function hourOf(value: string, locale: string, timeZone: string): number {
  return Number(formatTime(value, locale, timeZone).slice(0, 2));
}

interface TodayBookingsCardProps {
  /** Whose panel this is — the answer to a booking is sent for this organisation. */
  slug: string;
  /** Address book, so a returning client can be recognised and opened. */
  clients?: Client[];
  bookings: Booking[];
  /** Опубликованные и ещё никем не занятые окна — вторая половина суток мастера. */
  freeSlots?: string[];
  /**
   * Пояс, в котором у организации идут сутки. Карточка обязана считать день,
   * час строки и час шкалы одной меркой — иначе разметка сервера (UTC) и
   * первый кадр в браузере мастера расходятся, а «сегодня» в подписи спорит с
   * тем, что отфильтровано в списке.
   */
  timeZone: string;
}

export function TodayBookingsCard({
  slug,
  bookings,
  clients,
  freeSlots = [],
  timeZone,
}: TodayBookingsCardProps) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  /* The id, not the booking: the sheet has to show the status this booking has
     **now**, and a captured object would keep saying «ждёт подтверждения»
     under a button that has already answered it. */
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [openClient, setOpenClient] = useState<Client | null>(null);
  /*
   * Today's list arrives as server props, and `router.refresh()` takes a round
   * trip the master should not have to watch. The answer is already true on
   * the server when the request resolves, so the row shows it immediately and
   * the refresh only reconciles. Keyed by id, so it survives the re-render
   * that brings the fresh data.
   */
  const [answered, setAnswered] = useState<Record<string, BookingStatus>>({});

  /* Digits only: a booking keeps whatever the visitor typed, the address book
     keeps a normalised number. */
  const digits = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '');
  const clientFor = (booking: Booking) =>
    (clients ?? []).find((c) => digits(c.phone) === digits(booking.guestPhone)) ?? null;

  /* A cancelled booking leaves today's list — the same rule the server applies
     in `getTodaysBookings`, applied here so the two never disagree. */
  const visible = bookings
    .map((booking) =>
      answered[booking.id] ? { ...booking, status: answered[booking.id]! } : booking,
    )
    .filter((booking) => booking.status !== 'cancelled_by_master');

  const openBooking = visible.find((booking) => booking.id === openBookingId) ?? null;
  const cancellingBooking = bookings.find((booking) => booking.id === cancellingId) ?? null;
  const detailClient = openBooking ? clientFor(openBooking) : null;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      updateBookingStatus(slug, id, status),
    /* A failed tap must not be silent — the same law the bookings screen
       follows: «Подтвердить» with no signal looked exactly like success. */
    onError: (_error, { id }) => {
      setAnswered((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      toast({ message: t.common.actionFailed, tone: 'danger' });
    },
    onSuccess: (_booking, { id, status }) => {
      setAnswered((current) => ({ ...current, [id]: status }));
      /* Server props feed this card; the query keys feed the bookings screen
         and the nav badge (`usePendingBookingsCount`). Both are refreshed, so
         answering here cannot leave a stale «1» hanging over the tab. */
      router.refresh();
      void queryClient.invalidateQueries({ queryKey: ['bookings', slug] });
      void queryClient.invalidateQueries({ queryKey: ['slots', slug] });
    },
  });

  const answering = statusMutation.isPending;

  /* Сутки мастера: занятый час залит акцентом, опубликованное и никем не
     занятое окно очерчено пунктиром. Занятое побеждает свободное — если в час
     попали оба, мастер должен видеть работу, а не приглашение. */
  const railHours = new Map<number, RailHour>();
  for (const startsAt of freeSlots) {
    const hour = hourOf(startsAt, locale, timeZone);
    railHours.set(hour, { hour, state: 'free', detail: t.home.railFree });
  }
  for (const booking of visible) {
    const hour = hourOf(booking.startsAt, locale, timeZone);
    const services = booking.items.map((item) => item.serviceNameSnapshot).join(', ');
    const who = booking.guestName || t.home.guest;
    railHours.set(hour, {
      hour,
      state: 'booked',
      detail: services ? `${who} / ${services}` : who,
      bookingId: booking.id,
    });
  }

  const counts = [
    `${visible.length} ${plural(locale, visible.length, {
      zero: t.home.bookingCountZero,
      one: t.home.bookingCountOne,
      few: t.home.bookingCountFew,
      many: t.home.bookingCountMany,
      other: t.home.bookingCountOther,
    })}`,
    `${freeSlots.length} ${plural(locale, freeSlots.length, {
      zero: t.home.windowCountZero,
      one: t.home.windowCountOne,
      few: t.home.windowCountFew,
      many: t.home.windowCountMany,
      other: t.home.windowCountOther,
    })}`,
  ];

  return (
    <Card elevation="lead" className="flex flex-col gap-7">
      {/*
       * Шапка дня: дата микро-лейблом, счёт — дисплеем в две строки со
       * смещением по уровню прозрачности. Числа конкретные и проверяемые
       * («4 записи / 2 окна»), никаких процентов и графиков роста.
       */}
      <div className="flex flex-col gap-5">
        <CardLabel>{formatToday(locale, timeZone)}</CardLabel>
        <h2 className="font-display text-[clamp(2.4rem,10vw,3.75rem)] leading-[0.88] text-ink">
          {visible.length === 0 ? (
            <>
              {t.home.noBookingsToday}
              <br />
              <span className="text-ink-faint">{t.home.freeDayShort}</span>
            </>
          ) : (
            <>
              {counts[0]}
              <br />
              <span className="text-ink-faint">{counts[1]}</span>
            </>
          )}
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        <DayRail
          hours={[...railHours.values()]}
          timeZone={timeZone}
          onOpenBooking={setOpenBookingId}
        />
        {/* Легенда, а не украшение: цвет не может быть единственным носителем
            статуса, и подпись говорит то же самое словами. */}
        <p className="text-[13px] text-ink-faint">{t.home.railLegend}</p>
      </div>

      {visible.length === 0 ? (
        <p className="border-t border-border pt-6 text-[15px] text-ink-soft">{t.home.freeDay}</p>
      ) : (
        <div className="flex flex-col gap-px border-t border-border pt-6">
          {visible.map((booking) => {
            const meta = getBookingStatusMeta(t)[booking.status];
            const totalAmount = booking.items.reduce(
              (sum, item) => sum + item.priceAmountSnapshot,
              0,
            );
            const currency = booking.items[0]?.priceCurrencySnapshot ?? 'EUR';
            const serviceNames = booking.items.map((item) => item.serviceNameSnapshot).join(', ');

            return (
              /* Строка расписания системы: полоса акцента 3px во всю высоту —
                 «занято», дальше час, кто и что, и цена у правого края. Ни
                 рамки, ни скругления: строку отделяет тон поверхности. */
              <button
                key={booking.id}
                type="button"
                onClick={() => setOpenBookingId(booking.id)}
                className="action-motion grid w-full grid-cols-[3px_3.25rem_1fr_auto] items-center gap-x-3 bg-bg-sunken py-3 pr-4 text-left hover:bg-bg-raised sm:gap-x-4"
              >
                <span aria-hidden="true" className="h-full self-stretch bg-accent" />
                <span className="text-sm tabular-nums text-ink-soft">
                  {formatTime(booking.startsAt, locale, timeZone)}
                </span>
                <span className="min-w-0">
                  {/* Четыре вещи просятся в эту строку: час, имя, статус, цена.
                      Статус и метка клиента стоят на второй строке, а не рядом
                      с именем — деля первую, они сжимали «ывывы» до «ь», а
                      метка ценой собственного имени клиента — плохая сделка.
                      У правого края остаётся одна цена, и на 320px строка
                      больше не ломается. */}
                  <span className="block truncate text-[15px] text-ink">{booking.guestName}</span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-faint">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <ClientFlagBadge flag={clientFor(booking)?.flag ?? null} />
                    <span className="truncate">{serviceNames}</span>
                  </span>
                </span>
                {/* Money is data and sets in the data face — the display
                    face belongs to titles (Т-1). */}
                <span className="shrink-0 font-mono text-sm tabular-nums text-ink">
                  {formatPrice(totalAmount, currency)}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <Sheet
        open={Boolean(openBooking)}
        onOpenChange={(next) => !next && setOpenBookingId(null)}
        title={t.home.booking}
        description={openBooking ? formatTime(openBooking.startsAt, locale, timeZone) : undefined}
      >
        {openBooking ? (
          <div className="flex flex-col gap-3 text-[15px]">
            <div className="flex flex-col gap-1 border-y border-border py-3">
              {openBooking.items.map((item) => (
                <div key={item.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-ink-soft">{item.serviceNameSnapshot}</span>
                  <span className="shrink-0 tabular-nums text-ink">
                    {formatPrice(item.priceAmountSnapshot, item.priceCurrencySnapshot)}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-ink">{openBooking.guestName}</p>
            {/* Контакт — чернилами с подчёркиванием, а не розовым: #E2568A
                текстом на светлом поле даёт 3.54:1 и провалил бы AA. */}
            {openBooking.guestPhone ? (
              <a
                href={`tel:${openBooking.guestPhone.replace(/\s/g, '')}`}
                className="text-ink underline underline-offset-4"
              >
                {openBooking.guestPhone}
              </a>
            ) : null}
            {openBooking.guestInstagram ? (
              <a
                href={`https://instagram.com/${openBooking.guestInstagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-ink underline underline-offset-4"
              >
                @{openBooking.guestInstagram.replace(/^@/, '')}
              </a>
            ) : null}
            {openBooking.notes ? (
              <p className="text-sm text-ink-soft">{openBooking.notes}</p>
            ) : null}

            {/*
             * The answer lives where the question is asked. A booking that is
             * still waiting was readable here but not answerable: the master
             * had to leave the panel for the bookings screen to press the same
             * two buttons. They appear only while the booking is `pending` —
             * on a confirmed one there is nothing left to decide, and offering
             * «Подтвердить» again would be a control without a result.
             */}
            {openBooking.status === 'pending' ? (
              <div className="mt-1 flex gap-2">
                <Button
                  className="flex-1"
                  disabled={answering}
                  onClick={() =>
                    statusMutation.mutate(
                      { id: openBooking.id, status: 'confirmed' },
                      { onSuccess: () => setOpenBookingId(null) },
                    )
                  }
                >
                  {t.bookings.confirm}
                </Button>
                {/* Cancelling asks first, exactly as it does on the bookings
                    screen: the client sees the cancellation and it cannot be
                    taken back — a law of the action, not of the screen it is
                    pressed on. */}
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={answering}
                  onClick={() => {
                    setCancellingId(openBooking.id);
                    setOpenBookingId(null);
                  }}
                >
                  {t.bookings.cancelBooking}
                </Button>
              </div>
            ) : null}

            {/* Only when this person is already in the address book — a
                first-timer has no card to open. */}
            {detailClient ? (
              <Button
                variant="secondary"
                className="mt-1 w-full"
                onClick={() => {
                  setOpenClient(detailClient);
                  setOpenBookingId(null);
                }}
              >
                {t.bookings.openClient}
              </Button>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      <ConfirmSheet
        open={Boolean(cancellingBooking)}
        onOpenChange={(next) => !next && setCancellingId(null)}
        title={t.bookings.cancelConfirmTitle}
        description={
          cancellingBooking
            ? fmt(t.bookings.cancelConfirmText, { name: cancellingBooking.guestName ?? '' })
            : undefined
        }
        confirmLabel={t.bookings.cancelBooking}
        loading={answering}
        onConfirm={() => {
          if (!cancellingBooking) return;
          statusMutation.mutate(
            { id: cancellingBooking.id, status: 'cancelled_by_master' },
            { onSuccess: () => setCancellingId(null) },
          );
        }}
      />

      <ClientDetailSheet
        open={Boolean(openClient)}
        onOpenChange={(next) => !next && setOpenClient(null)}
        client={openClient}
        stats={openClient ? getClientVisitStats(openClient, bookings) : null}
        history={openClient ? getClientBookings(openClient, bookings) : []}
        onToggleBlocked={() => undefined}
        togglingBlocked={false}
      />
    </Card>
  );
}
