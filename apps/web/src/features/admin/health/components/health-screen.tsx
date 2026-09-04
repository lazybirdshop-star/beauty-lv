'use client';

import { useQuery } from '@tanstack/react-query';

import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { useT, type Messages } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import { getPlatformHealth } from '../api';
import type { PlatformHealth } from '../types';

type Tone = 'ok' | 'degraded' | 'down';

interface ServiceRow {
  key: string;
  title: string;
  tone: Tone;
  /** Что именно известно — предложением, а не значением поля. */
  detail: string;
  /** Отклик, если он у этой службы измеряется. */
  latency?: string;
}

/**
 * Строки состояния — предложениями, а не значениями полей.
 *
 * «push: false» требует перевода на человеческий каждый раз, когда на него
 * смотрят. «Уведомления не настроены: заявки не придут ни на один телефон» —
 * не требует, и заодно называет последствие, ради которого экран и открыли.
 *
 * Колонки «последние 48 проверок» из артборда здесь нет: истории проверок
 * продукт не ведёт, и полоска из сорока восьми зелёных клеток была бы
 * рисунком, а не данными. Вместо неё — то, что известно на самом деле.
 */
function services(health: PlatformHealth, t: Messages): ServiceRow[] {
  const unreachable = health.push.admins - health.push.adminsReachable;
  const jobsInFlight = health.jobs.pending + health.jobs.running;

  return [
    {
      key: 'database',
      title: t.health.database,
      tone: 'ok',
      detail: t.health.databaseOk,
      latency:
        health.databaseLatencyMs === undefined ? undefined : `${health.databaseLatencyMs} ms`,
    },
    {
      key: 'mail',
      title: t.health.mail,
      tone: health.mail.configured ? 'ok' : 'down',
      detail: health.mail.configured ? t.health.mailOk : t.health.mailMissing,
    },
    {
      key: 'push',
      title: t.health.push,
      tone: !health.push.configured
        ? 'down'
        : health.push.admins === 0 || unreachable > 0
          ? 'degraded'
          : 'ok',
      detail: !health.push.configured
        ? t.health.pushMissing
        : health.push.admins === 0
          ? t.health.pushNoAdmins
          : unreachable > 0
            ? fmt(t.health.pushPartial, {
                reachable: health.push.adminsReachable,
                total: health.push.admins,
              })
            : fmt(t.health.pushOk, { total: health.push.admins }),
    },
    {
      key: 'queue',
      title: t.health.queue,
      tone: 'ok',
      detail:
        health.queue.pendingRequests > 0
          ? fmt(t.health.queueWaiting, { count: health.queue.pendingRequests })
          : t.health.queueEmpty,
    },
    {
      key: 'jobs',
      title: t.health.jobs,
      /* Умершие задачи — главное, что тут говорится: письмо, исчерпавшее
         попытки, выглядит на всех остальных экранах как отправленное, и
         узнают о нём по звонку клиента, не получившего подтверждения. */
      tone: health.jobs.failed > 0 ? 'down' : 'ok',
      detail:
        health.jobs.failed > 0
          ? fmt(t.health.jobsFailed, { count: health.jobs.failed })
          : jobsInFlight > 0
            ? fmt(t.health.jobsPending, { count: jobsInFlight })
            : t.health.jobsEmpty,
    },
    {
      key: 'activity',
      title: t.health.activity,
      tone: 'ok',
      detail: fmt(t.health.activityBookings, { count: health.activity.bookingsLast24h }),
    },
  ];
}

function statusBadge(tone: Tone, t: Messages) {
  const cls = tone === 'ok' ? 'b-green' : tone === 'degraded' ? 'b-amber' : 'b-red';
  const label =
    tone === 'ok'
      ? t.health.statusOk
      : tone === 'degraded'
        ? t.health.statusDegraded
        : t.health.statusDown;

  return (
    <span className={`badge ${cls}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

/** «16 с назад» — то, что стоит в артборде в колонке «Проверено». */
function checkedAgo(checkedAt: string | undefined, t: Messages): string {
  if (!checkedAt) return '—';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(checkedAt).getTime()) / 1000));
  if (seconds < 5) return t.health.checkedJustNow;
  if (seconds < 60) return fmt(t.health.checkedSecondsAgo, { count: seconds });
  return fmt(t.health.checkedMinutesAgo, { count: Math.round(seconds / 60) });
}

/**
 * Состояние платформы — по артборду `AdminHealth.dc.html`.
 *
 * Молчащая почта и невыданные ключи push выглядят на всех остальных экранах
 * ровно как исправная работа — писем нет, уведомлений нет, — и первым это
 * замечает мастер, не получившая ответа на заявку.
 *
 * Полоса сверху появляется только когда есть на что смотреть. Зелёная полоса
 * «всё хорошо» на каждом открытии учит пролистывать то место, где однажды
 * будет написано «почта не отправляет писем».
 */
export function HealthScreen() {
  const t = useT();
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-health'],
    queryFn: getPlatformHealth,
    /* Экран открывают, чтобы посмотреть «сейчас», и оставляют открытым.
       Полминуты — достаточно редко для шести проверок и достаточно часто,
       чтобы увиденное не было вчерашним. */
    refetchInterval: 30_000,
  });

  if (isError) return <LoadError onRetry={() => void refetch()} />;
  if (isPending) return <Skeleton className="h-72 w-full" />;

  const rows = services(data, t);
  const troubled = rows.filter((row) => row.tone !== 'ok');

  return (
    <>
      <PageHeader
        title={t.nav.health}
        meta={checkedAgo(data.checkedAt, t)}
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <Icon name="refresh" className="ico-18" />
            <span>{t.health.refreshNow}</span>
          </button>
        }
      />

      {troubled.length > 0 ? (
        <div className="health-alert">
          <span style={{ color: 'var(--amber)' }}>
            <Icon name="alert" className="ico-24" />
          </span>
          <div className="col" style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>
              {troubled.length === 1
                ? t.health.attentionOne
                : fmt(t.health.attentionMany, { count: troubled.length })}
            </span>
            <span className="t-meta">{troubled.map((row) => row.detail).join(' · ')}</span>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="admin-table">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 220 }}>{t.health.colService}</th>
                <th style={{ width: 150 }}>{t.admin.colStatus}</th>
                <th style={{ width: 120 }}>{t.health.colLatency}</th>
                <th>{t.health.colDetail}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td style={{ fontWeight: 500 }}>{row.title}</td>
                  <td>{statusBadge(row.tone, t)}</td>
                  <td>
                    <span className="tnum muted">{row.latency ?? '—'}</span>
                  </td>
                  <td style={{ whiteSpace: 'normal' }}>{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="t-meta" style={{ fontSize: 12.5, marginTop: 12, maxWidth: '70ch' }}>
        {t.health.latencyHint}
      </p>
    </>
  );
}
