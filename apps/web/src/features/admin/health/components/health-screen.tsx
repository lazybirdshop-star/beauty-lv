'use client';

import { CheckCircle, Warning, XCircle } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, useT, type Messages } from '@/lib/i18n';

import { getPlatformHealth } from '../api';
import type { PlatformHealth } from '../types';

type Tone = 'ok' | 'warning' | 'down';

interface Line {
  title: string;
  detail: string;
  tone: Tone;
}

const ICONS: Record<Tone, typeof CheckCircle> = {
  ok: CheckCircle,
  warning: Warning,
  down: XCircle,
};

const COLORS: Record<Tone, string> = {
  ok: 'text-success',
  warning: 'text-warning',
  down: 'text-danger',
};

/**
 * Строки состояния — предложениями, а не значениями полей.
 *
 * «push: false» требует перевода на человеческий каждый раз, когда на него
 * смотрят. «Уведомления не настроены: заявки не придут ни на один телефон» —
 * не требует, и заодно называет последствие, ради которого экран и открыли.
 */
function lines(health: PlatformHealth, t: Messages): Line[] {
  const unreachable = health.push.admins - health.push.adminsReachable;

  return [
    {
      title: t.health.database,
      detail: t.health.databaseOk,
      tone: 'ok',
    },
    {
      title: t.health.mail,
      detail: health.mail.configured ? t.health.mailOk : t.health.mailMissing,
      tone: health.mail.configured ? 'ok' : 'down',
    },
    {
      title: t.health.push,
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
      tone: !health.push.configured
        ? 'down'
        : health.push.adminsReachable === 0
          ? 'warning'
          : unreachable > 0
            ? 'warning'
            : 'ok',
    },
    {
      title: t.health.queue,
      detail:
        health.queue.pendingRequests > 0
          ? fmt(t.health.queueWaiting, { count: health.queue.pendingRequests })
          : t.health.queueEmpty,
      tone: 'ok',
    },
    {
      title: t.health.activity,
      detail: fmt(t.health.activityBookings, { count: health.activity.bookingsLast24h }),
      tone: 'ok',
    },
  ];
}

/**
 * Состояние платформы: работает ли то, о чём иначе узнают по жалобе.
 *
 * Молчащая почта и невыданные ключи push выглядят на всех остальных экранах
 * ровно как исправная работа — писем нет, уведомлений нет, — и первым это
 * замечает мастер, не получившая ответа на заявку.
 */
export function HealthScreen() {
  const t = useT();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin-health'],
    queryFn: getPlatformHealth,
    /* Экран открывают, чтобы посмотреть «сейчас», и оставляют открытым.
       Полминуты — достаточно редко для пяти счётчиков и достаточно часто,
       чтобы увиденное не было вчерашним. */
    refetchInterval: 30_000,
  });

  if (isError) return <LoadError onRetry={() => void refetch()} />;
  if (isPending) return <Skeleton className="h-72 w-full" />;

  return (
    <Card className="flex flex-col divide-y divide-border">
      {lines(data, t).map((line) => {
        const Icon = ICONS[line.tone];
        return (
          <div key={line.title} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
            <Icon size={20} weight="fill" className={`mt-0.5 shrink-0 ${COLORS[line.tone]}`} />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">{line.title}</p>
              <p className="mt-0.5 text-sm text-ink-soft">{line.detail}</p>
            </div>
          </div>
        );
      })}
    </Card>
  );
}
