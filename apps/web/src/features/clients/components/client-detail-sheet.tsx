'use client';

import { CalendarCheck, ClockCounterClockwise, Prohibit, Sparkle } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';

import type { Client } from '../types';
import type { ClientVisitStats } from '../visit-stats';

interface ClientDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  stats: ClientVisitStats | null;
  onToggleBlocked: (client: Client) => void;
  togglingBlocked: boolean;
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
  onToggleBlocked,
  togglingBlocked,
}: ClientDetailSheetProps) {
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
