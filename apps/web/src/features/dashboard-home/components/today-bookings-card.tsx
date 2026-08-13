'use client';

import { CalendarCheck, Sparkle } from '@phosphor-icons/react/dist/ssr';

import { ClientFlagBadge } from '@/features/clients/components/client-flag-badge';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Sheet } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';
import { fmt, useLocale, useT } from '@/lib/i18n';
import { ClientDetailSheet } from '@/features/clients/components/client-detail-sheet';
import { getClientBookings, getClientVisitStats } from '@/features/clients/visit-stats';
import type { Client } from '@/features/clients/types';

import { updateBookingStatus } from '../../bookings/api';
import { getBookingStatusMeta } from '../../bookings/status-meta';
import type { Booking, BookingStatus } from '../../bookings/types';

function formatTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function formatToday(locale: string): string {
  const formatted = new Date().toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });
  /* Sentence case in JS, not CSS: `capitalize` uppercases every word, and
     «Воскресенье, 10 Августа» is wrong in Russian — only the first letter
     of the line takes the capital. */
  return formatted.charAt(0).toLocaleUpperCase(locale) + formatted.slice(1);
}

interface TodayBookingsCardProps {
  /** Whose panel this is — the answer to a booking is sent for this organisation. */
  slug: string;
  /** Address book, so a returning client can be recognised and opened. */
  clients?: Client[];
  bookings: Booking[];
}

export function TodayBookingsCard({ slug, bookings, clients }: TodayBookingsCardProps) {
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

  return (
    <Card elevation="lifted" className="mx-auto w-full max-w-2xl p-5 sm:p-6">
      {/* Centred icon, centred title, centred date is the composition of an
          empty state, and it was running above a day that had work in it —
          about 380px of decoration between the master and the one thing she
          opened the panel to see. The generous, centred treatment now belongs
          to the free day, which has nothing else to show and can carry it. */}
      <div
        className={
          visible.length === 0
            ? 'flex flex-col items-center gap-2 text-center'
            : 'flex items-center gap-3'
        }
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent',
            visible.length === 0 ? 'h-12 w-12' : 'h-10 w-10',
          )}
        >
          <CalendarCheck size={visible.length === 0 ? 24 : 20} weight="fill" />
        </span>
        <div className={visible.length === 0 ? '' : 'min-w-0'}>
          {/* One title step for both states: 24px on the free day was a
              second display size for no reason the ramp knows about. */}
          <h2 className="font-display text-[22px] leading-none text-ink">{t.home.todayBookings}</h2>
          <p className="mt-1 text-sm text-ink-soft">{formatToday(locale)}</p>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-5 flex flex-col items-center gap-2 rounded-3xl bg-bg-sunken/70 px-4 py-10 text-center">
          <Sparkle size={22} className="text-ink-faint" />
          <p className="text-sm text-ink-soft">{t.home.freeDay}</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {visible.map((booking) => {
            const meta = getBookingStatusMeta(t)[booking.status];
            const totalAmount = booking.items.reduce(
              (sum, item) => sum + item.priceAmountSnapshot,
              0,
            );
            const currency = booking.items[0]?.priceCurrencySnapshot ?? 'EUR';
            const serviceNames = booking.items.map((item) => item.serviceNameSnapshot).join(', ');

            return (
              <button
                key={booking.id}
                type="button"
                onClick={() => setOpenBookingId(booking.id)}
                className="press flex w-full items-center gap-4 rounded-3xl bg-bg-sunken/70 px-4 py-3 text-left hover:bg-bg-sunken"
              >
                <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-2xl bg-bg-raised font-mono text-sm font-semibold tabular-nums text-accent shadow-soft">
                  {formatTime(booking.startsAt, locale)}
                </div>
                <div className="min-w-0 flex-1">
                  {/* Four things want this row: time, name, status, price.
                      The marker goes on the second line rather than beside the
                      name — sharing line one it squeezed «ывывы» down to «ь»,
                      and a marker that costs the client's own name is a bad
                      trade. On its own line it keeps the word, so it is still
                      read by shape, word and colour rather than colour alone. */}
                  <p className="truncate text-[15px] font-semibold text-ink">{booking.guestName}</p>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
                    <ClientFlagBadge flag={clientFor(booking)?.flag ?? null} />
                    <span className="truncate">{serviceNames}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  {/* Money is data and sets in the data face — the display
                      face belongs to titles (Т-1). */}
                  <span className="font-mono text-sm font-semibold leading-none tabular-nums text-ink">
                    {formatPrice(totalAmount, currency)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <Sheet
        open={Boolean(openBooking)}
        onOpenChange={(next) => !next && setOpenBookingId(null)}
        title={t.home.booking}
        description={openBooking ? formatTime(openBooking.startsAt, locale) : undefined}
      >
        {openBooking ? (
          <div className="flex flex-col gap-3 text-[15px]">
            <div className="flex flex-col gap-1 rounded-2xl border border-border px-4 py-3">
              {openBooking.items.map((item) => (
                <div key={item.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-ink-soft">{item.serviceNameSnapshot}</span>
                  <span className="shrink-0 text-ink">
                    {formatPrice(item.priceAmountSnapshot, item.priceCurrencySnapshot)}
                  </span>
                </div>
              ))}
            </div>

            <p className="font-semibold text-ink">{openBooking.guestName}</p>
            {openBooking.guestPhone ? (
              <a href={`tel:${openBooking.guestPhone.replace(/\s/g, '')}`} className="text-accent">
                {openBooking.guestPhone}
              </a>
            ) : null}
            {openBooking.guestInstagram ? (
              <a
                href={`https://instagram.com/${openBooking.guestInstagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent"
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
