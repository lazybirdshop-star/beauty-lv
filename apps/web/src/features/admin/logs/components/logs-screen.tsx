'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { useLocale, useT, type Messages } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import {
  AdminChip,
  AdminFilterRow,
  AdminSearch,
  AdminTable,
  type FilterOption,
} from '../../shared/components/admin-list-chrome';
import { useAdminPage } from '../../shared/use-admin-page';
import { actionLabel } from '../action-labels';
import { listAuditLog, listLogActions } from '../api';
import type {
  AuditLogEntry,
  AuditLogFilters,
  LogActorFilter,
  LogDateFilter,
  LogSeverityFilter,
} from '../types';

/** Как часто журнал перечитывает себя, когда включено живое обновление. */
const LIVE_INTERVAL_MS = 10_000;

/**
 * Границы окна дат — в часовом поясе браузера.
 *
 * У платформы своего пояса нет, и «сегодня» здесь значит «сегодня у того, кто
 * смотрит». Никакой другой ответ не был бы вернее: администратор разбирает
 * происшествие своим временем.
 */
function dateWindow(filter: LogDateFilter): { from?: string; to?: string } {
  if (filter === 'all') return {};

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === 'week') start.setDate(start.getDate() - 6);

  return { from: start.toISOString() };
}

/** Короткий вид идентификатора: начало и конец, как в макете. */
function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

/**
 * Журнал административных действий — по артборду `AdminLogs.dc.html`.
 *
 * Таблицей: строки журнала сравнивают между собой по времени и по важности, и
 * колонки для этого и нужны. Событие и объект — моноширинным: это значения, а
 * не текст, и в столбик они читаются только выровненными.
 *
 * «Обновлять» перечитывает список раз в десять секунд. Выключено по
 * умолчанию: журнал чаще открывают, чтобы разобраться в прошлом, и строки,
 * уезжающие из-под курсора, этому мешают.
 */
export function LogsScreen() {
  const t = useT();
  const locale = useLocale();

  const [action, setAction] = useState<string>('all');
  const [severity, setSeverity] = useState<LogSeverityFilter>('all');
  const [actor, setActor] = useState<LogActorFilter>('all');
  const [date, setDate] = useState<LogDateFilter>('today');
  const [live, setLive] = useState(false);

  /* Список сит приходит из самих данных: действие, появившееся в продукте,
     оказывается здесь само, без второй записи о нём в коде экрана. */
  const { data: actions } = useQuery({
    queryKey: ['admin-log-actions'],
    queryFn: listLogActions,
    select: (response: { actions: string[] }) => response.actions,
  });

  const window = useMemo(() => dateWindow(date), [date]);

  const filters: AuditLogFilters = {
    action: action === 'all' ? undefined : action,
    severity: severity === 'all' ? undefined : severity,
    actor: actor === 'all' ? undefined : actor,
    ...window,
  };

  const list = useAdminPage<AuditLogEntry, AuditLogFilters>({
    key: ['admin-logs'],
    filters,
    fetchPage: listAuditLog,
    pageSize: 25,
    refetchInterval: live ? LIVE_INTERVAL_MS : false,
  });

  const eventOptions: FilterOption<string>[] = [
    { key: 'all', label: t.admin.filterAll },
    ...(actions ?? []).map((value) => ({ key: value, label: actionLabel(value, t) })),
  ];

  const severityOptions: FilterOption<LogSeverityFilter>[] = [
    { key: 'all', label: t.admin.filterAll },
    { key: 'info', label: t.admin.severityInfo },
    { key: 'warning', label: t.admin.severityWarning },
  ];

  const actorOptions: FilterOption<LogActorFilter>[] = [
    { key: 'all', label: t.admin.filterAll },
    { key: 'person', label: t.admin.actorPerson },
    { key: 'support', label: t.admin.actorSupport },
    { key: 'system', label: t.admin.actorSystem },
  ];

  const dateOptions: FilterOption<LogDateFilter>[] = [
    { key: 'today', label: t.admin.dateToday },
    { key: 'week', label: t.admin.dateWeek },
    { key: 'all', label: t.admin.dateAll },
  ];

  return (
    <>
      <PageHeader
        title={t.nav.logs}
        meta={t.admin.logsMeta}
        actions={
          <>
            <AdminSearch
              value={list.query}
              onChange={list.setQuery}
              placeholder={t.admin.searchLogs}
            />
            <LiveSwitch on={live} onChange={setLive} t={t} />
          </>
        }
      />

      <AdminFilterRow
        sortedBy={fmt(t.admin.logsCount, { shown: list.items.length, total: list.total })}
      >
        <AdminChip
          label={t.admin.filterSeverity}
          value={severity}
          options={severityOptions}
          onChange={setSeverity}
        />
        {eventOptions.length > 1 ? (
          <AdminChip
            label={t.admin.filterEvent}
            value={action}
            options={eventOptions}
            onChange={setAction}
          />
        ) : null}
        <AdminChip
          label={t.admin.filterActor}
          value={actor}
          options={actorOptions}
          onChange={setActor}
        />
        <AdminChip
          label={t.admin.filterDate}
          value={date}
          options={dateOptions}
          onChange={setDate}
        />
      </AdminFilterRow>

      <AdminTable
        list={list}
        empty={t.admin.noLogs}
        head={
          <tr>
            <th style={{ width: 160 }}>{t.admin.colTimestamp}</th>
            <th style={{ width: 250 }}>{t.admin.colEvent}</th>
            <th style={{ width: 230 }}>{t.admin.colActor}</th>
            <th>{t.admin.colEntity}</th>
            <th style={{ width: 120 }}>{t.admin.colSeverity}</th>
          </tr>
        }
      >
        {list.items.map((entry) => (
          <tr key={entry.id}>
            <td>
              <span className="mono" style={{ fontSize: 12.5 }}>
                {new Intl.DateTimeFormat(locale, {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }).format(new Date(entry.createdAt))}
              </span>
            </td>
            <td>
              <span className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>
                {entry.action}
              </span>
              <span className="t-meta" style={{ display: 'block', fontSize: 11.5 }}>
                {actionLabel(entry.action, t)}
              </span>
            </td>
            <td>
              {entry.actorName ?? t.admin.system}
              {/* Метка поддержки обязана быть видна: это тот самый вопрос,
                  ради которого журнал и читают — «это точно была я?». */}
              {entry.impersonatedByName ? (
                <span className="badge b-amber" style={{ marginLeft: 8 }}>
                  {t.admin.logViaSupport}: {entry.impersonatedByName}
                </span>
              ) : null}
            </td>
            <td>
              <span className="mono" style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
                {entry.entityType} · {shortId(entry.entityId)}
              </span>
            </td>
            <td>
              <span className={entry.severity === 'warning' ? 'badge b-amber' : 'badge b-neutral'}>
                <span className="dot" />
                {entry.severity === 'warning' ? t.admin.severityWarning : t.admin.severityInfo}
              </span>
            </td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}

/**
 * Переключатель живого обновления — `.switch` из набора.
 *
 * Кнопкой с `role="switch"`, а не флажком: в макете это тумблер, и человек
 * ждёт от него нажатия, а не галочки. Состояние озвучивается `aria-checked`.
 */
function LiveSwitch({
  on,
  onChange,
  t,
}: {
  on: boolean;
  onChange: (value: boolean) => void;
  t: Messages;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className="live-switch"
      title={t.admin.liveHint}
      onClick={() => onChange(!on)}
    >
      <span className={on ? 'switch is-on' : 'switch'} />
      <span style={{ fontSize: 13 }}>{t.admin.liveLabel}</span>
    </button>
  );
}
