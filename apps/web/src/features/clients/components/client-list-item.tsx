'use client';

import { PencilSimple, TrashSimple } from '@phosphor-icons/react';
import type { MouseEvent } from 'react';

import { fmt, plural, useLocale, useT } from '@/lib/i18n';
import type { Messages } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import type { Client } from '../types';
import type { ClientVisitStats } from '../visit-stats';

interface ClientListItemProps {
  client: Client;
  stats: ClientVisitStats;
  onOpenDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function formatLastVisit(iso: string | null, t: Messages, locale: string): string {
  if (!iso) return t.clients.noVisits;
  const date = new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  return fmt(t.clients.lastVisitOn, { date });
}

function stopPropagation(handler: () => void) {
  return (event: MouseEvent) => {
    event.stopPropagation();
    handler();
  };
}

export function ClientListItem({
  client,
  stats,
  onOpenDetail,
  onEdit,
  onDelete,
}: ClientListItemProps) {
  const t = useT();
  const locale = useLocale();
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpenDetail();
      }}
      className="flex cursor-pointer items-center justify-between gap-3 text-left"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-ink">{client.fullName}</p>
          {client.flag ? (
            <span
              title={client.flag === 'attention' ? 'Осторожно' : 'Любимый клиент'}
              aria-label={client.flag === 'attention' ? 'Осторожно' : 'Любимый клиент'}
              className={cn(
                'ml-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full align-middle',
                client.flag === 'attention' ? 'bg-danger' : 'bg-success',
              )}
            />
          ) : null}
          {client.isBlocked ? <Badge tone="danger">{t.clients.blocked}</Badge> : null}
        </div>
        <p className="mt-0.5 text-sm text-ink-soft">{client.phone}</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {stats.totalBookings}{' '}
          {plural(locale, stats.totalBookings, {
            zero: t.clients.visitCountZero,
            one: t.clients.visitCountOne,
            few: t.clients.visitCountFew,
            many: t.clients.visitCountMany,
            other: t.clients.visitCountOther,
          })}{' '}
          · {formatLastVisit(stats.lastVisitAt, t, locale)}
        </p>
        {client.notes ? <p className="mt-1 text-sm text-ink-soft">{client.notes}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={stopPropagation(onEdit)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft hover:bg-bg-sunken"
        >
          <PencilSimple size={18} />
          <span className="sr-only">{t.common.edit}</span>
        </button>
        <button
          type="button"
          onClick={stopPropagation(onDelete)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-danger hover:bg-danger-soft"
        >
          <TrashSimple size={18} />
          <span className="sr-only">{t.common.delete}</span>
        </button>
      </div>
    </Card>
  );
}
