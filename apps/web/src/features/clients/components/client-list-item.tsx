'use client';

import { PencilSimple, TrashSimple } from '@phosphor-icons/react';
import type { MouseEvent } from 'react';

import { fmt, plural, useLocale, useT } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';
import type { Messages } from '@/lib/i18n/messages';
import { Badge } from '@/components/ui/badge';
import { RowAction } from '@/components/ui/row-action';
import { Card } from '@/components/ui/card';

import type { Client } from '../types';
import type { ClientVisitStats } from '../visit-stats';
import { ClientFlagBadge } from './client-flag-badge';

interface ClientListItemProps {
  client: Client;
  stats: ClientVisitStats;
  onOpenDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function formatLastVisit(
  iso: string | null,
  t: Messages,
  locale: string,
  timeZone?: string,
): string {
  if (!iso) return t.clients.noVisits;
  const date = new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    timeZone,
  });
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
  const timeZone = useTimeZone();
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        // Space scrolls the page by default — without this the card both
        // opened and jumped the list under the keyboard user.
        event.preventDefault();
        onOpenDetail();
      }}
      className="flex cursor-pointer items-center justify-between gap-3 text-left"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-ink">{client.fullName}</p>
          <ClientFlagBadge flag={client.flag} />
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
          · {formatLastVisit(stats.lastVisitAt, t, locale, timeZone)}
        </p>
        {/* A private note is set apart rather than left to read as one more
            line of client data: a rule and the quieter ink say "this is what
            you wrote", not "this is what the client told you". */}
        {client.notes ? (
          <p className="mt-2 border-l-2 border-border-strong pl-2.5 text-sm text-ink-soft">
            {client.notes}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <RowAction
          label={t.common.edit}
          icon={<PencilSimple size={18} />}
          onClick={stopPropagation(onEdit)}
        />
        <RowAction
          label={t.common.delete}
          icon={<TrashSimple size={18} />}
          tone="danger"
          onClick={stopPropagation(onDelete)}
        />
      </div>
    </Card>
  );
}
