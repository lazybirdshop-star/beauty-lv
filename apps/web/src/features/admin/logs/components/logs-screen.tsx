'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

import {
  AdminFilters,
  AdminListFooter,
  AdminSearch,
  type FilterOption,
} from '../../shared/components/admin-list-chrome';
import { useAdminList } from '../../shared/use-admin-list';
import { actionLabel } from '../action-labels';
import { listAuditLog, listLogActions } from '../api';
import { AuditActorLine } from './audit-actor-line';
import type { AuditLogEntry } from '../types';

/**
 * Журнал административных действий.
 *
 * Раньше экран забирал последние двести записей и фильтровал их в браузере —
 * то есть на вопрос «кто заблокировал этого мастера в июне» ответить было
 * нельзя в принципе: июнь в двести последних строк не попадал. Теперь поиск и
 * фильтр по виду действия уходят на сервер, а страницы догружаются.
 */
export function LogsScreen() {
  const t = useT();
  const locale = useLocale();
  const [action, setAction] = useState<string>('all');

  /* Список сит приходит из самих данных: действие, появившееся в продукте,
     оказывается здесь само, без второй записи о нём в коде экрана. */
  const { data: actions } = useQuery({
    queryKey: ['admin-log-actions'],
    queryFn: listLogActions,
    select: (response: { actions: string[] }) => response.actions,
  });

  const list = useAdminList<AuditLogEntry, { action?: string }>({
    key: ['admin-logs'],
    filters: { action: action === 'all' ? undefined : action },
    fetchPage: listAuditLog,
  });

  const filters: FilterOption<string>[] = [
    { key: 'all', label: t.admin.filterAll },
    ...(actions ?? []).map((value) => ({ key: value, label: actionLabel(value, t) })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <AdminSearch value={list.query} onChange={list.setQuery} placeholder={t.admin.searchLogs} />
      {filters.length > 1 ? (
        <AdminFilters options={filters} value={action} onChange={setAction} />
      ) : null}

      {list.isError ? (
        <LoadError onRetry={list.retry} />
      ) : list.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : list.items.length > 0 ? (
        <>
          <div className="flex flex-col gap-3">
            {list.items.map((entry) => (
              <Card key={entry.id} className="flex items-center justify-between gap-3">
                <AuditActorLine
                  actorName={entry.actorName}
                  action={entry.action}
                  impersonatedByName={entry.impersonatedByName}
                />
                <span className="shrink-0 text-xs text-ink-faint">
                  {formatDateTime(entry.createdAt, locale)}
                </span>
              </Card>
            ))}
          </div>
          <AdminListFooter
            shown={list.items.length}
            total={list.total}
            hasMore={list.hasMore}
            onLoadMore={list.loadMore}
            loading={list.isLoadingMore}
          />
        </>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">{t.admin.noLogs}</Card>
      )}
    </div>
  );
}
