'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { formatDurationShort, formatTime } from '@/lib/format';
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
  /** Тон услуги — точка перед названием услуги, когда мастер не назван. */
  tone?: string | null;
  status: BookingStatus;
  /** Куда ведёт строка; вместо ссылки может быть действие `onOpen`. */
  href?: string;
  onOpen?: () => void;
  /** Имя мастера — в салоне каждая строка называет мастера (первым словом). */
  memberName?: string;
  /** Тон мастера — точка перед его именем (`.member-dot` прототипа). */
  memberTone?: string;
  firstVisit?: boolean;
  /** Прошедший визит приглушён: «где я сейчас» видно, не считая часы. */
  past?: boolean;
  register?: VisitRegister;
  /** Действие справа — пилюля «Завершён», «Подтвердить». */
  action?: ReactNode;
  /** Показывать ли пилюлю статуса; по умолчанию — везде, кроме общей ленты. */
  showStatus?: boolean;
  /**
   * Подпись дня — у строки не сегодняшнего дня («пт 18 сент.»): она встаёт
   * на место часа, а час уходит под неё вместо длительности. В списке, где
   * рядом стоят разные дни, час без дня ничего не говорит.
   */
  day?: string;
}

/**
 * Строка визита — одна на главную, список записей, неделю календаря и
 * страницу участника; анатомия `.visit` прототипа «Кабинет 2026».
 *
 * Слева — час крупно и длительность под ним («1 ч 30»), в середине — клиент
 * и услуга, а в салоне за услугой — мастер с точкой его тона; справа — статус
 * и действие. Статус и действие стоят вне кнопки строки: кнопка внутри кнопки
 * — не разметка, а ловушка для читалки. Первый визит назван пилюлей со
 * словом, а не точкой без подписи.
 *
 * Командный регистр — одна строка «мастер · клиент · услуга · до 12:00»:
 * ресепшену важнее, у кого визит, чем сколько он длится.
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
  memberTone,
  firstVisit,
  past,
  register = 'spacious',
  action,
  day,
  showStatus: statusVisible,
}: VisitRowProps) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const meta = getBookingStatusMeta(t)[status];
  const endsAt = new Date(new Date(startsAt).getTime() + minutes * 60_000).toISOString();
  const from = formatTime(startsAt, locale, timeZone);
  const to = formatTime(endsAt, locale, timeZone);
  const duration = formatDurationShort(minutes, {
    hoursShort: t.common.hoursShort,
    minutesShort: t.common.minutesShort,
  });

  const dot = (value: string) => (
    <i className="visit-row__dot" style={{ '--tone': value } as CSSProperties} aria-hidden="true" />
  );

  const client = (
    <span className="visit-row__client">
      <span className="visit-row__name">{clientName}</span>
      {firstVisit ? <span className="visit-row__first">{t.bookings.firstVisit}</span> : null}
    </span>
  );

  const body =
    register === 'team' ? (
      <>
        <span className="visit-row__member">{memberName}</span>
        {client}
        <span className="visit-row__meta">
          · {serviceName} · {fmt(t.workspace.untilTime, { time: to })}
        </span>
      </>
    ) : (
      <>
        {day ? (
          <span className="visit-row__time is-day tnum">
            {day}
            <small>{from}</small>
          </span>
        ) : (
          <span className="visit-row__time tnum">
            {from}
            <small>{duration}</small>
          </span>
        )}
        <span className="visit-row__text">
          {client}
          <span className="visit-row__meta">
            {tone && !memberName ? dot(tone) : null}
            {serviceName}
            {memberName ? (
              <>
                {' '}
                {memberTone ? dot(memberTone) : '· '}
                {memberName}
              </>
            ) : null}
          </span>
        </span>
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

  /* Пилюля статуса молчит там, где состояние уже названо разделом: над
     «Ждут отметки» и «Сейчас в кресле» стоит «Подтверждена» в каждой строке —
     слово, которое ничего не добавляет к решению. */
  const showStatus = statusVisible ?? register !== 'team';

  return (
    <div className={cn('visit-row', past && 'is-past')} data-register={register}>
      {main}
      {showStatus || action ? (
        <span className="visit-row__acts">
          {showStatus ? <Badge tone={meta.tone}>{meta.label}</Badge> : null}
          {action}
        </span>
      ) : null}
    </div>
  );
}
