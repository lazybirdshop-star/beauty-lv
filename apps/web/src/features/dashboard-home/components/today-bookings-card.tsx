import { CalendarCheck, Sparkle } from '@phosphor-icons/react/dist/ssr';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatPrice } from '@/lib/format';

import { BOOKING_STATUS_META } from '../../bookings/status-meta';
import type { Booking } from '../../bookings/types';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatToday(): string {
  return new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
}

interface TodayBookingsCardProps {
  bookings: Booking[];
}

export function TodayBookingsCard({ bookings }: TodayBookingsCardProps) {
  return (
    <Card className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-6 sm:p-8">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
          <CalendarCheck size={22} weight="fill" />
        </span>
        <h2 className="text-lg font-semibold text-ink">Записи сегодня</h2>
        <p className="text-sm capitalize text-ink-soft">{formatToday()}</p>
      </div>

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-bg-sunken px-4 py-8 text-center">
          <Sparkle size={22} className="text-ink-faint" />
          <p className="text-sm text-ink-soft">На сегодня записей нет — свободный день.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {bookings.map((booking) => {
            const meta = BOOKING_STATUS_META[booking.status];
            const totalAmount = booking.items.reduce(
              (sum, item) => sum + item.priceAmountSnapshot,
              0,
            );
            const currency = booking.items[0]?.priceCurrencySnapshot ?? 'EUR';
            const serviceNames = booking.items.map((item) => item.serviceNameSnapshot).join(', ');

            return (
              <div
                key={booking.id}
                className="flex items-center gap-4 rounded-xl bg-bg-sunken px-4 py-3.5"
              >
                <div className="shrink-0 rounded-lg bg-bg-raised px-3 py-2 text-center font-mono text-sm font-semibold text-accent">
                  {formatTime(booking.startsAt)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">{booking.guestName}</p>
                  <p className="truncate text-sm text-ink-soft">{serviceNames}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <span className="text-sm font-semibold tabular-nums text-ink">
                    {formatPrice(totalAmount, currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
