'use client';

/**
 * Журнал действий заведения — «кто это сделал» (спецификация дашборда §72).
 *
 * Только у владелицы и только то, что меняет заведение: команда, клиенты,
 * записи, профиль. Двадцать строк и «Показать ещё», а не бесконечная лента:
 * журнал открывают с вопросом про конкретный случай, и он почти всегда в
 * первой странице.
 */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';

import { actorLabel, entryLabel, listActivityLog } from '../activity-log';

const PAGE = 20;
/** Столько же, сколько отдаёт сервер за раз: дальше — вопрос к поддержке, а не к ленте. */
const MAX = 100;

export function ActivityLogCard({ slug }: { slug: string }) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const [limit, setLimit] = useState(PAGE);

  const query = useQuery({
    queryKey: ['activity-log', slug, limit],
    queryFn: () => listActivityLog(slug, limit),
    placeholderData: (previous) => previous,
  });

  const canShowMore =
    query.data !== undefined && query.data.items.length < query.data.total && limit < MAX;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.workspace.journalTitle}</CardTitle>
      </CardHeader>
      <p className="-mt-2 mb-4 text-sm text-ink-soft">{t.workspace.journalHint}</p>

      {query.isError ? (
        <LoadError onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : query.data.items.length === 0 ? (
        <p className="text-sm text-ink-soft">{t.workspace.journalEmpty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {query.data.items.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
            >
              <span className="min-w-0 text-sm text-ink">
                <span className="font-semibold">{actorLabel(entry, t)}</span>{' '}
                <span className={entry.severity === 'warning' ? 'text-danger' : undefined}>
                  {entryLabel(entry, t)}
                </span>
              </span>
              <span className="text-xs tabular-nums text-ink-soft">
                {formatDateTime(
                  entry.createdAt,
                  locale,
                  { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
                  timeZone,
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canShowMore ? (
        <button
          type="button"
          className="mt-3 self-start text-sm font-semibold text-ink underline-offset-4 hover:underline"
          disabled={query.isFetching}
          onClick={() => setLimit((current) => Math.min(current + PAGE, MAX))}
        >
          {query.isFetching ? t.common.loading : t.workspace.journalMore}
        </button>
      ) : null}
    </Card>
  );
}
