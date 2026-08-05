'use client';

import { CalendarCheck, Sparkle } from '@phosphor-icons/react/dist/ssr';

import { ClientFlagBadge } from '@/features/clients/components/client-flag-badge';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { useLocale, useT } from '@/lib/i18n';
import { ClientDetailSheet } from '@/features/clients/components/client-detail-sheet';
import { getClientBookings, getClientVisitStats } from '@/features/clients/visit-stats';
import type { Client } from '@/features/clients/types';

import { getBookingStatusMeta } from '../../bookings/status-meta';
import type { Booking } from '../../bookings/types';

function formatTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function formatToday(locale: string): string {
  return new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', weekday: 'long' });
}

interface TodayBookingsCardProps {
  /** Address book, so a returning client can be recognised and opened. */
  clients?: Client[];
  bookings: Booking[];
}

export function TodayBookingsCard({ bookings, clients }: TodayBookingsCardProps) {
  const t = useT();
  const locale = useLocale();
  const [openBooking, setOpenBooking] = useState<Booking | null>(null);
  const [openClient, setOpenClient] = useState<Client | null>(null);

  /* Digits only: a booking keeps whatever the visitor typed, the address book
     keeps a normalised number. */
  const digits = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '');
  const clientFor = (booking: Booking) =>
    (clients ?? []).find((c) => digits(c.phone) === digits(booking.guestPhone)) ?? null;

  const detailClient = openBooking ? clientFor(openBooking) : null;
  return (
    <GlassCard elevation="lifted" className="mx-auto w-full max-w-2xl p-5 sm:p-6">
      {/* Centred icon, centred title, centred date is the composition of an
          empty state, and it was running above a day that had work in it —
          about 380px of decoration between the master and the one thing she
          opened the panel to see. The generous, centred treatment now belongs
          to the free day, which has nothing else to show and can carry it. */}
      <div
        className={
          bookings.length === 0
            ? 'flex flex-col items-center gap-2 text-center'
            : 'flex items-center gap-3'
        }
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent',
            bookings.length === 0 ? 'h-12 w-12' : 'h-10 w-10',
          )}
        >
          <CalendarCheck size={bookings.length === 0 ? 24 : 20} weight="fill" />
        </span>
        <div className={bookings.length === 0 ? '' : 'min-w-0'}>
          <h2
            className={cn(
              'font-display leading-none text-ink',
              bookings.length === 0 ? 'text-[24px]' : 'text-[22px]',
            )}
          >
            {t.home.todayBookings}
          </h2>
          <p className="mt-1 text-sm capitalize text-ink-soft">{formatToday(locale)}</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="mt-5 flex flex-col items-center gap-2 rounded-3xl bg-bg-sunken/70 px-4 py-10 text-center">
          <Sparkle size={22} className="text-ink-faint" />
          <p className="text-sm text-ink-soft">{t.home.freeDay}</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {bookings.map((booking) => {
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
                onClick={() => setOpenBooking(booking)}
                className="press flex w-full items-center gap-4 rounded-3xl bg-bg-sunken/70 px-4 py-3.5 text-left hover:bg-bg-sunken"
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
                  <span className="font-display text-base leading-none tabular-nums text-ink">
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
        onOpenChange={(next) => !next && setOpenBooking(null)}
        title={t.home.booking}
        description={openBooking ? formatTime(openBooking.startsAt, locale) : undefined}
      >
        {openBooking ? (
          <div className="flex flex-col gap-3 text-[15px]">
            <div className="flex flex-col gap-1 border border-border px-3.5 py-3">
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

            {/* Only when this person is already in the address book — a
                first-timer has no card to open. */}
            {detailClient ? (
              <Button
                variant="secondary"
                className="mt-1 w-full"
                onClick={() => {
                  setOpenClient(detailClient);
                  setOpenBooking(null);
                }}
              >
                {t.bookings.openClient}
              </Button>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      <ClientDetailSheet
        open={Boolean(openClient)}
        onOpenChange={(next) => !next && setOpenClient(null)}
        client={openClient}
        stats={openClient ? getClientVisitStats(openClient, bookings) : null}
        history={openClient ? getClientBookings(openClient, bookings) : []}
        onToggleBlocked={() => undefined}
        togglingBlocked={false}
      />
    </GlassCard>
  );
}
