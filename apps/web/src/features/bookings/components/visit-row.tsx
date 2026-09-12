'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { ServiceBar } from '@/components/cabinet/service-bar';
import { Badge } from '@/components/ui/badge';
import { formatDuration, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import { cn } from '@/lib/utils';

import { getBookingStatusMeta } from '../status-meta';
import type { BookingStatus } from '../types';

export type VisitRegister = 'spacious' | 'compact' | 'team';

export interface VisitRowProps {
  startsAt: string;
  minutes: number;
  clientName: string;
  serviceName: string;
  /** Тон услуги — полоса слева (правило 02). */
  tone?: string | null;
  status: BookingStatus;
  /** Куда ведёт строка; вместо ссылки может быть действие `onOpen`. */
  href?: string;
  onOpen?: () => void;
  /** Имя мастера — в салоне каждая строка называет мастера (первым словом). */
  memberName?: string;
  firstVisit?: boolean;
  /** Прошедший визит приглушён: «где я сейчас» видно, не считая часы. */
  past?: boolean;
  register?: VisitRegister;
  /** Действие справа — пилюля «Завершён», «Подтвердить». */
  action?: ReactNode;
}

/**
 * Строка визита — одна на главную, список календаря, командный день и
 * страницу участника (Design System V2 §4). Всегда показывает время,
 * клиента, услугу, длительность и статус; регистр меняет высоту и порядок,
 * не состав.
 */
export function VisitRow({
  startsAt,
  minutes,
  clientName,
  serviceName,
  tone,
  status,
  href,
  onOpen,
  memberName,
  firstVisit,
  past,
  register = 'spacious',
  action,
}: VisitRowProps) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const meta = getBookingStatusMeta(t)[status];
  const endsAt = new Date(new Date(startsAt).getTime() + minutes * 60_000).toISOString();
  const from = formatTime(startsAt, locale, timeZone);
  const to = formatTime(endsAt, locale, timeZone);
  const duration = formatDuration(minutes, {
    hoursShort: t.common.hoursShort,
    minutesShort: t.common.minutesShort,
  });

  const client = (
    <span className="visit-row__client type-strong">
      {clientName}
      {firstVisit ? (
        <span className="first-visit-dot" title={t.bookings.firstVisit}>
          <span className="sr-only">{t.bookings.firstVisit}</span>
        </span>
      ) : null}
    </span>
  );

  const body =
    register === 'team' ? (
      <>
        <span className="visit-row__member type-dense">{memberName}</span>
        {client}
        <span className="visit-row__meta type-meta">
          · {serviceName} · {fmt(t.workspace.untilTime, { time: to })}
        </span>
      </>
    ) : (
      <>
        <span className="visit-row__time type-dense tnum">
          {from}–{to}
        </span>
        <span className="visit-row__text">
          {client}
          <span className="visit-row__meta type-meta">
            {serviceName} · {duration}
            {memberName ? ` · ${memberName}` : ''}
          </span>
        </span>
        <Badge tone={meta.tone} className="visit-row__status">
          {meta.label}
        </Badge>
      </>
    );

  const main = href ? (
    <Link className="visit-row__main" href={href}>
      {body}
    </Link>
  ) : (
    <button type="button" className="visit-row__main" onClick={onOpen}>
      {body}
    </button>
  );

  return (
    <div className={cn('visit-row', past && 'is-past')} data-register={register}>
      <ServiceBar tone={tone} inset />
      {main}
      {action ? <span className="visit-row__action">{action}</span> : null}
    </div>
  );
}
