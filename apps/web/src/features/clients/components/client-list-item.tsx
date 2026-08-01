'use client';

import { PencilSimple, TrashSimple } from '@phosphor-icons/react';

import { Card } from '@/components/ui/card';

import type { Client } from '../types';
import type { ClientVisitStats } from '../visit-stats';

interface ClientListItemProps {
  client: Client;
  stats: ClientVisitStats;
  onEdit: () => void;
  onDelete: () => void;
}

function formatLastVisit(iso: string | null): string {
  if (!iso) return 'ещё не было визитов';
  return `последний визит ${new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
}

export function ClientListItem({ client, stats, onEdit, onDelete }: ClientListItemProps) {
  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-ink">{client.fullName}</p>
        <p className="mt-0.5 text-sm text-ink-soft">{client.phone}</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {stats.visitCount} {stats.visitCount === 1 ? 'визит' : 'визитов'} ·{' '}
          {formatLastVisit(stats.lastVisitAt)}
        </p>
        {client.notes ? <p className="mt-1 text-sm text-ink-soft">{client.notes}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft hover:bg-bg-sunken"
        >
          <PencilSimple size={18} />
          <span className="sr-only">Редактировать</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-danger hover:bg-danger-soft"
        >
          <TrashSimple size={18} />
          <span className="sr-only">Удалить</span>
        </button>
      </div>
    </Card>
  );
}
