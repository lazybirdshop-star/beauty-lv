'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { initials } from '@/lib/avatar';
import { formatDuration, formatTime, formatUpcomingVisit } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import type { Booking } from '../types';

export type QueueKind = 'pending' | 'ended' | 'cancelled';

export interface QueueRowProps {
  kind: QueueKind;
  booking: Booking;
  href: string;
  /** Имя мастера — в салоне строка называет, к кому визит. */
  memberName?: string;
  firstVisit?: boolean;
  busy?: boolean;
  onConfirm?: () => void;
  onDecline?: () => void;
  onComplete?: () => void;
  onNoShow?: () => void;
}

/**
 * Строка очереди «Нужен ответ» — одна на три вида ответа (approved R-26,
 * N-1, N-7): ждёт — пустая янтарная точка, Подтвердить и Отклонить; прошёл
 * без отметки — квадрат с галкой, Завершён и Не пришёл; отменён клиентом —
 * зачёркнутое время и причина в кавычках. Форма и слово, не только цвет.
 */
export function QueueRow({
  kind,
  booking,
  href,
  memberName,
  firstVisit,
  busy,
  onConfirm,
  onDecline,
  onComplete,
  onNoShow,
}: QueueRowProps) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const name = booking.guestName || t.home.guest;
  const services = booking.items.map((item) => item.serviceNameSnapshot).join(' + ');
  const minutes = booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) || 30;
  const endsAt = new Date(new Date(booking.startsAt).getTime() + minutes * 60_000).toISOString();
  const withMember = memberName ? ` · ${fmt(t.workspace.withMember, { name: memberName })}` : '';

  const meta =
    kind === 'pending'
      ? `${formatUpcomingVisit(booking.startsAt, locale, timeZone)} ${formatTime(booking.startsAt, locale, timeZone)} · ${services} · ${formatDuration(minutes, { hoursShort: t.common.hoursShort, minutesShort: t.common.minutesShort })}${withMember}`
      : kind === 'ended'
        ? `${fmt(t.workspace.endedAt, { time: formatTime(endsAt, locale, timeZone) })}${withMember}`
        : null;

  return (
    <li className="queue-row" data-kind={kind}>
      <div className="queue-row__head">
        <span className="portrait queue-row__portrait" aria-hidden="true">
          {initials(name)}
        </span>
        <Link className="queue-row__name type-strong" href={href}>
          {name}
          {firstVisit ? (
            <span className="first-visit-dot" title={t.bookings.firstVisit}>
              <span className="sr-only">{t.bookings.firstVisit}</span>
            </span>
          ) : null}
        </Link>
        {kind === 'pending' ? (
          <span className="queue-row__mark queue-row__mark--pending" aria-hidden="true" />
        ) : kind === 'ended' ? (
          <Icon name="checkSquare" className="ico-16 queue-row__mark" />
        ) : null}
      </div>

      {kind === 'cancelled' ? (
        <p className="queue-row__meta type-meta">
          <s className="queue-row__struck">
            {fmt(t.workspace.cancelledAt, { time: formatTime(booking.startsAt, locale, timeZone) })}
          </s>
          {withMember}
        </p>
      ) : (
        <p className="queue-row__meta type-meta">{meta}</p>
      )}

      {kind === 'cancelled' && booking.cancellationReason ? (
        <p className="queue-row__reason type-dense">“{booking.cancellationReason}”</p>
      ) : null}

      {kind === 'pending' ? (
        <div className="queue-row__actions">
          <Button size="pill" variant="primary" disabled={busy} onClick={onConfirm}>
            {t.bookings.confirm}
          </Button>
          <Button size="pill" variant="secondary" disabled={busy} onClick={onDecline}>
            {t.bookings.decline}
          </Button>
        </div>
      ) : kind === 'ended' ? (
        <div className="queue-row__actions">
          <Button size="pill" variant="success" disabled={busy} onClick={onComplete}>
            {t.bookings.markCompleted}
          </Button>
          <Button size="pill" variant="secondary" disabled={busy} onClick={onNoShow}>
            {t.bookings.markNoShow}
          </Button>
        </div>
      ) : null}
    </li>
  );
}
