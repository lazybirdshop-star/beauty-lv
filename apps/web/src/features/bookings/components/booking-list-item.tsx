'use client';

import type { Client } from '@/features/clients/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatPrice } from '@/lib/format';

import { useT } from '@/lib/i18n';

import { getBookingStatusMeta } from '../status-meta';
import type { Booking, BookingStatus } from '../types';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
  const meta = getBookingStatusMeta(t)[booking.status];
  const totalAmount = booking.items.reduce((sum, item) => sum + item.priceAmountSnapshot, 0);
  const currency = booking.items[0]?.priceCurrencySnapshot ?? 'EUR';
  const serviceNames = booking.items.map((item) => item.serviceNameSnapshot).join(', ');

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink">{formatDateTime(booking.startsAt)}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-ink-soft">
            {/* A known client opens their card, the same one the Clients
                section shows; a first-timer stays plain text rather than a
                control that leads nowhere. */}
            {client && onOpenClient ? (
              <button
                type="button"
                onClick={onOpenClient}
                className="press inline-flex items-center gap-1.5 font-semibold text-ink underline decoration-border-strong underline-offset-4 hover:decoration-accent"
              >
                {booking.guestName}
              </button>
            ) : (
              <span>{booking.guestName}</span>
            )}

            <span>· {booking.guestPhone}</span>

            {booking.guestInstagram ? (
              // Opens the profile instead of making the master copy a handle
              // out of a booking and paste it into another app.
              <a
                href={`https://instagram.com/${booking.guestInstagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noreferrer noopener"
                className="press text-accent underline decoration-transparent underline-offset-4 hover:decoration-accent"
              >
                · @{booking.guestInstagram.replace(/^@/, '')}
              </a>
            ) : null}
          </p>

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
          {client?.flag ? (
            <Badge tone={client.flag === 'attention' ? 'danger' : 'success'}>
              {client.flag === 'attention' ? t.clients.flagAttention : t.clients.flagFavourite}
            </Badge>
          ) : null}
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-ink-soft">
        <span className="truncate">{serviceNames}</span>
        <span className="shrink-0 font-semibold text-ink">
          {formatPrice(totalAmount, currency)}
        </span>
      </div>

      {booking.notes ? <p className="text-sm text-ink-faint">{booking.notes}</p> : null}

      {booking.status === 'pending' ? (
        <div className="mt-1 flex gap-2">
          <Button size="sm" onClick={() => onSetStatus('confirmed')} disabled={updating}>
            Подтвердить
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onSetStatus('cancelled_by_master')}
            disabled={updating}
          >
            Отменить
          </Button>
        </div>
      ) : null}

      {booking.status === 'confirmed' ? (
        <div className="mt-1 flex gap-2">
          <Button size="sm" onClick={() => onSetStatus('completed')} disabled={updating}>
            Завершить
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onSetStatus('no_show')}
            disabled={updating}
          >
            Не пришёл
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onSetStatus('cancelled_by_master')}
            disabled={updating}
          >
            Отменить
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
