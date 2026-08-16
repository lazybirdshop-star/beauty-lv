'use client';

import { InstagramLogo, Phone } from '@phosphor-icons/react';

import { ClientFlagBadge } from '@/features/clients/components/client-flag-badge';
import type { Client } from '@/features/clients/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime, formatPrice } from '@/lib/format';

import { useLocale, useT } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';

import { getBookingStatusMeta } from '../status-meta';
import type { Booking, BookingStatus } from '../types';

// Reads as a compact chip, taps as 44px: the pseudo-element grows the hit box
// into the gap around it, so two of them still share one line on a phone.
const CONTACT_CHIP =
  "press relative inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-bg-sunken px-3 py-1.5 text-[13px] font-semibold text-ink-soft transition-colors after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

interface BookingListItemProps {
  booking: Booking;
  /** Matched by phone against the address book, when this person is in it. */
  client?: Client | null;
  onOpenClient?: () => void;
  onSetStatus: (status: BookingStatus) => void;
  updating: boolean;
}

export function BookingListItem({
  booking,
  client,
  onOpenClient,
  onSetStatus,
  updating,
}: BookingListItemProps) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const meta = getBookingStatusMeta(t)[booking.status];
  const totalAmount = booking.items.reduce((sum, item) => sum + item.priceAmountSnapshot, 0);
  const currency = booking.items[0]?.priceCurrencySnapshot ?? 'EUR';
  const serviceNames = booking.items.map((item) => item.serviceNameSnapshot).join(', ');

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink">
            {formatDateTime(booking.startsAt, locale, undefined, timeZone)}
          </p>
          {/* A known client opens their card, the same one the Clients
              section shows; a first-timer stays plain text rather than a
              control that leads nowhere. */}
          {client && onOpenClient ? (
            <button
              type="button"
              onClick={onOpenClient}
              /* The hit box is grown by a pseudo-element rather than by
                 padding: the name has to sit tight under the date, and a
                 44px-tall text link would push the card open. Same trick the
                 switch uses. */
              className="press relative mt-0.5 inline-flex max-w-full items-center text-sm font-semibold text-ink underline decoration-border-strong underline-offset-4 after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="truncate">{booking.guestName}</span>
            </button>
          ) : (
            <p className="mt-0.5 truncate text-sm text-ink-soft">{booking.guestName}</p>
          )}

          {client?.notes ? (
            <p className="mt-1 line-clamp-2 border-l-2 border-border-strong pl-2 text-[13px] text-ink-soft">
              {client.notes}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* A named badge beside the status, not an 8px dot on a secondary
              line. A marker that reads "осторожно" has to be seen before the
              master answers, and at dot size it was there without being
              visible — which is the same as not being there. */}
          {client?.flag ? <ClientFlagBadge flag={client.flag} /> : null}
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
      </div>

      {/* Contacts are ways to reach this person, so they are controls, not a
          sentence. Run as dot-separated text they wrapped into lines beginning
          with a stray «·», and neither the number nor the handle could be
          tapped — the master had to retype a phone she was already looking at.
          Full card width, not the column beside the badges: squeezed in there
          two chips could not share a line. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <a href={`tel:${(booking.guestPhone ?? '').replace(/\s/g, '')}`} className={CONTACT_CHIP}>
          <Phone size={14} weight="fill" aria-hidden="true" />
          <span className="tabular-nums">{booking.guestPhone}</span>
        </a>
        {booking.guestInstagram ? (
          <a
            href={`https://instagram.com/${booking.guestInstagram.replace(/^@/, '')}`}
            target="_blank"
            rel="noreferrer noopener"
            className={CONTACT_CHIP}
          >
            <InstagramLogo size={14} aria-hidden="true" />@
            {booking.guestInstagram.replace(/^@/, '')}
          </a>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-sm text-ink-soft">
        <span className="truncate">{serviceNames}</span>
        <span className="shrink-0 font-semibold text-ink">
          {formatPrice(totalAmount, currency)}
        </span>
      </div>

      {booking.notes ? <p className="text-sm text-ink-faint">{booking.notes}</p> : null}

      {booking.status === 'pending' ? (
        <div className="mt-1 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onSetStatus('confirmed')} disabled={updating}>
            {t.bookings.confirm}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onSetStatus('cancelled_by_master')}
            disabled={updating}
          >
            {t.bookings.cancelBooking}
          </Button>
        </div>
      ) : null}

      {booking.status === 'confirmed' ? (
        <div className="mt-1 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onSetStatus('completed')} disabled={updating}>
            {t.bookings.complete}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onSetStatus('no_show')}
            disabled={updating}
          >
            {t.bookings.noShow}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onSetStatus('cancelled_by_master')}
            disabled={updating}
          >
            {t.bookings.cancelBooking}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
