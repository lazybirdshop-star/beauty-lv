'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatPrice } from '@/lib/format';

import { BOOKING_STATUS_META } from '../status-meta';
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
  onSetStatus: (status: BookingStatus) => void;
  updating: boolean;
}

export function BookingListItem({ booking, onSetStatus, updating }: BookingListItemProps) {
  const meta = BOOKING_STATUS_META[booking.status];
  const totalAmount = booking.items.reduce((sum, item) => sum + item.priceAmountSnapshot, 0);
  const currency = booking.items[0]?.priceCurrencySnapshot ?? 'EUR';
  const serviceNames = booking.items.map((item) => item.serviceNameSnapshot).join(', ');

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink">{formatDateTime(booking.startsAt)}</p>
          <p className="mt-0.5 truncate text-sm text-ink-soft">
            {booking.guestName} · {booking.guestPhone}
            {booking.guestInstagram ? ` · @${booking.guestInstagram}` : ''}
          </p>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
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
