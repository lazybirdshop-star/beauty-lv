'use client';

/**
 * Журнал действий заведения — «кто это сделал» (спецификация дашборда §72),
 * строками `.log-row` прототипа «Кабинет 2026»: время узкой колонкой слева,
 * кто и что — справа.
 *
 * Только у владелицы и только то, что меняет заведение: команда, клиенты,
 * записи, профиль. Двадцать строк и «Показать ещё», а не бесконечная лента:
 * журнал открывают с вопросом про конкретный случай, и он почти всегда в
 * первой странице.
 */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';

import { actorLabel, collapseRepeats, entryLabel, listActivityLog } from '../activity-log';

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
        <div>
          <CardTitle>{t.workspace.journalTitle}</CardTitle>
          <CardHint>{t.workspace.journalHint}</CardHint>
        </div>
      </CardHeader>

      {query.isError ? (
        <LoadError onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : query.data.items.length === 0 ? (
        <p className="settings-note">{t.workspace.journalEmpty}</p>
      ) : (
        <ul className="log-list">
          {collapseRepeats(query.data.items).map(({ entry, count }) => (
            <li key={entry.id} className="log-row">
              <span className="log-row__time tnum">
                {/* Тем же видом, что везде: «16 сен, 08:56», а не «16 сент.». */}
                {formatDateTime(entry.createdAt, locale, undefined, timeZone)}
              </span>
              <span className="log-row__text">
                {/* «Кто · что», а не «кто сделал что»: у глагола прошедшего
                    времени есть род, а пола человека журнал не знает. */}
                <b>{actorLabel(entry, t)}</b> ·{' '}
                <span className={entry.severity === 'warning' ? 'is-warning' : undefined}>
                  {entryLabel(entry, t)}
                </span>
                {count > 1 ? <span className="log-row__count tnum"> ×{count}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canShowMore ? (
        <Button
          variant="ghost"
          size="pill"
          className="log-more"
          disabled={query.isFetching}
          onClick={() => setLimit((current) => Math.min(current + PAGE, MAX))}
        >
          {query.isFetching ? t.common.loading : t.workspace.journalMore}
        </Button>
      ) : null}
    </Card>
  );
}
