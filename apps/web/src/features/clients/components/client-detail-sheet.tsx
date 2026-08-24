'use client';

import { CalendarCheck, ClockCounterClockwise, Prohibit, Sparkle } from '@phosphor-icons/react';
import { useState } from 'react';

import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import type { Messages } from '@/lib/i18n/messages';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
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

function formatVisitDate(iso: string, locale: string, timeZone?: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  });
}

function formatLastVisit(
  iso: string | null,
  t: Messages,
  locale: string,
  timeZone?: string,
): string {
  if (!iso) return t.clients.noCompleted;
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
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
  const locale = useLocale();
  const timeZone = useTimeZone();
  /* Blocking asks first — the red button sits one thumb-slip below a long
     scrolling visit history. Unblocking is the forgiving direction and
     stays a single tap. */
  const [confirmingBlock, setConfirmingBlock] = useState(false);
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
            <Badge tone="danger">{t.clients.blocked}</Badge>
            <span className="text-xs text-ink-faint">{t.clients.blockedHint}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-3 rounded-xl bg-bg-sunken px-4 py-3">
          <CalendarCheck size={20} className="shrink-0 text-ink-faint" />
          <div>
            <p className="text-[15px] font-semibold text-ink">
              {stats.totalBookings}{' '}
              {plural(locale, stats.totalBookings, {
                zero: t.clients.visitCountZero,
                one: t.clients.visitCountOne,
                few: t.clients.visitCountFew,
                many: t.clients.visitCountMany,
                other: t.clients.visitCountOther,
              })}
            </p>
            <p className="text-sm text-ink-soft">{t.clients.totalVisits}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-bg-sunken px-4 py-3">
          <Sparkle size={20} className="shrink-0 text-ink-faint" />
          <div>
            <p className="text-[15px] font-semibold text-ink">
              {stats.favoriteServiceName ?? t.clients.noData}
            </p>
            <p className="text-sm text-ink-soft">{t.clients.favouriteService}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-bg-sunken px-4 py-3">
          <ClockCounterClockwise size={20} className="shrink-0 text-ink-faint" />
          <div>
            <p className="text-[15px] font-semibold text-ink">
              {formatLastVisit(stats.lastVisitAt, t, locale, timeZone)}
            </p>
            <p className="text-sm text-ink-soft">{t.clients.lastVisit}</p>
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
            <p className="mt-1 text-sm text-ink-soft">{t.clients.notes}</p>
          </div>
        ) : null}

        {history.length > 0 ? (
          <div className="mt-1">
            <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
              {t.clients.visitHistory}
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
                    className="flex items-center gap-3 rounded-2xl bg-bg-sunken/70 px-4 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">
                        {formatVisitDate(booking.startsAt, locale, timeZone)}
                      </span>
                      <span className="block truncate text-xs text-ink-soft">
                        {booking.items.map((item) => item.serviceNameSnapshot).join(', ')}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <span className="font-mono text-xs tabular-nums text-ink-soft">
                        {formatPrice(total, currency, locale)}
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
          onClick={() => (client.isBlocked ? onToggleBlocked(client) : setConfirmingBlock(true))}
          disabled={togglingBlocked}
        >
          <Prohibit size={18} />
          {client.isBlocked ? t.clients.unblock : t.clients.block}
        </Button>
      </div>

      <ConfirmSheet
        open={confirmingBlock}
        onOpenChange={setConfirmingBlock}
        title={t.clients.blockConfirmTitle}
        description={fmt(t.clients.blockConfirmText, { name: client.fullName })}
        confirmLabel={t.clients.block}
        loading={togglingBlocked}
        onConfirm={() => {
          onToggleBlocked(client);
          setConfirmingBlock(false);
        }}
      />
    </Sheet>
  );
}
