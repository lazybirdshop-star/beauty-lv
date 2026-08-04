'use client';

import { CalendarCheck, ClockCounterClockwise, Prohibit, Sparkle } from '@phosphor-icons/react';

import { useT } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { formatPrice } from '@/lib/format';

import { getBookingStatusMeta } from '../../bookings/status-meta';
import type { Booking } from '../../bookings/types';
import type { Client } from '../types';
import type { ClientVisitStats } from '../visit-stats';

interface ClientDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  stats: ClientVisitStats | null;
  /** Newest first, cancellations included — see `getClientBookings`. */
  history: Booking[];
  onToggleBlocked: (client: Client) => void;
  togglingBlocked: boolean;
}

function formatVisitDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatLastVisit(iso: string | null): string {
  if (!iso) return 'ещё не было завершённых визитов';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ClientDetailSheet({
  open,
  onOpenChange,
  client,
  stats,
  history,
  onToggleBlocked,
  togglingBlocked,
}: ClientDetailSheetProps) {
  const t = useT();
  if (!client || !stats) return null;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={client.fullName}
      description={client.phone}
    >
      <div className="flex flex-col gap-3">
        {client.isBlocked ? (
          <div className="flex items-center gap-2">
            <Badge tone="danger">Заблокирован</Badge>
            <span className="text-xs text-ink-faint">
              Не может записаться на публичной странице
            </span>
          </div>
        ) : null}
        <div className="flex items-center gap-3 rounded-xl bg-bg-sunken px-4 py-3">
          <CalendarCheck size={20} className="shrink-0 text-accent" />
          <div>
            <p className="text-[15px] font-semibold text-ink">
              {stats.totalBookings} {stats.totalBookings === 1 ? 'запись' : 'записей'}
            </p>
            <p className="text-sm text-ink-soft">Всего записей (без отменённых)</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-bg-sunken px-4 py-3">
          <Sparkle size={20} className="shrink-0 text-accent" />
          <div>
            <p className="text-[15px] font-semibold text-ink">
              {stats.favoriteServiceName ?? 'ещё нет данных'}
            </p>
            <p className="text-sm text-ink-soft">Чаще всего выбирает</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-bg-sunken px-4 py-3">
          <ClockCounterClockwise size={20} className="shrink-0 text-accent" />
          <div>
            <p className="text-[15px] font-semibold text-ink">
              {formatLastVisit(stats.lastVisitAt)}
            </p>
            <p className="text-sm text-ink-soft">Последний визит</p>
          </div>
        </div>

        {client.email ? (
          <div className="rounded-xl bg-bg-sunken px-4 py-3">
            <p className="text-[15px] font-semibold text-ink">{client.email}</p>
            <p className="text-sm text-ink-soft">Email</p>
          </div>
        ) : null}

        {client.instagramHandle ? (
          <div className="rounded-xl bg-bg-sunken px-4 py-3">
            <p className="text-[15px] font-semibold text-ink">@{client.instagramHandle}</p>
            <p className="text-sm text-ink-soft">Instagram</p>
          </div>
        ) : null}

        {client.notes ? (
          <div className="rounded-xl bg-bg-sunken px-4 py-3">
            <p className="text-[15px] text-ink">{client.notes}</p>
            <p className="mt-1 text-sm text-ink-soft">Заметка</p>
          </div>
        ) : null}

        {history.length > 0 ? (
          <div className="mt-1">
            <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
              История визитов
            </p>
            <ul className="flex flex-col gap-1.5">
              {history.map((booking) => {
                const meta = getBookingStatusMeta(t)[booking.status];
                const total = booking.items.reduce(
                  (sum, item) => sum + item.priceAmountSnapshot,
                  0,
                );
                const currency = booking.items[0]?.priceCurrencySnapshot ?? 'EUR';
                return (
                  <li
                    key={booking.id}
                    className="flex items-center gap-3 rounded-2xl bg-bg-sunken/70 px-3.5 py-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">
                        {formatVisitDate(booking.startsAt)}
                      </span>
                      <span className="block truncate text-xs text-ink-soft">
                        {booking.items.map((item) => item.serviceNameSnapshot).join(', ')}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <span className="text-xs tabular-nums text-ink-soft">
                        {formatPrice(total, currency)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <Button
          variant={client.isBlocked ? 'secondary' : 'danger'}
          className="mt-2 w-full"
          onClick={() => onToggleBlocked(client)}
          disabled={togglingBlocked}
        >
          <Prohibit size={18} />
          {client.isBlocked ? 'Разблокировать клиента' : 'Заблокировать клиента'}
        </Button>
      </div>
    </Sheet>
  );
}
