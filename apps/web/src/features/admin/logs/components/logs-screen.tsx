'use client';

import { MagnifyingGlass } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useLocale, useT } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import { listAuditLog } from '../api';
import { actionLabel } from '../action-labels';
import type { AuditLogEntry } from '../types';

function formatDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function matchesQuery(entry: AuditLogEntry, query: string): boolean {
  if (!query) return true;
  const haystack = `${entry.actorName ?? ''} ${entry.action} ${entry.entityType}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function LogsScreen() {
  const t = useT();
  const locale = useLocale();
  const { data: entries, isLoading } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: listAuditLog,
  });

  const [query, setQuery] = useState('');
  const filtered = (entries ?? []).filter((entry) => matchesQuery(entry, query));

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <MagnifyingGlass
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.admin.searchLogs}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filtered.map((entry) => (
            <Card key={entry.id} className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink">
                <span className="font-semibold">{entry.actorName ?? t.admin.system}</span>{' '}
                {actionLabel(entry.action, t)}
              </p>
              <span className="shrink-0 text-xs text-ink-faint">
                {formatDateTime(entry.createdAt, locale)}
              </span>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">{t.admin.noLogs}</Card>
      )}
    </div>
  );
}
