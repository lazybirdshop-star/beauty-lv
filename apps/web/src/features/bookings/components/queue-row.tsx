'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { formatDateTime, formatDuration, formatTime, formatUpcomingVisit } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import { telLink } from '../contact-links';
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
 * Строка очереди «Нужен ответ» — `.cell.tight` прототипа «Кабинет 2026»:
 * ниша с именем, строкой «услуга · когда · к кому», откуда пришла запись и
 * решениями внизу. Ждёт — «Подтвердить» и «Отклонить»; прошёл без отметки —
 * «Завершён» и «Не пришёл»; отменён клиентом — зачёркнутое время и причина.
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
  /*
   * Откуда взялась запись и когда: «со страницы записи, 12 сент., 19:40». От
   * ответа зависит тон — клиент сам нашёл окно или его записали на стойке, и
   * как давно он ждёт ответа.
   */
  const origin =
    kind === 'pending'
      ? `${booking.source === 'admin_manual' ? t.workspace.fromManual : t.workspace.fromPublicPage}, ${formatDateTime(booking.createdAt, locale, undefined, timeZone)}`
      : null;

  const meta =
    kind === 'pending'
      ? `${services} · ${formatUpcomingVisit(booking.startsAt, locale, timeZone)} · ${formatDuration(minutes, { hoursShort: t.common.hoursShort, minutesShort: t.common.minutesShort })}${withMember}`
      : kind === 'ended'
        ? `${fmt(t.workspace.endedAt, { time: formatTime(endsAt, locale, timeZone) })}${withMember}`
        : null;

  return (
    <li className="queue-row" data-kind={kind}>
      <p className="queue-row__name">
        <Link href={href}>{name}</Link>
        {firstVisit ? <span className="queue-row__first">{t.bookings.firstVisit}</span> : null}
      </p>

      {kind === 'cancelled' ? (
        <p className="queue-row__meta">
          <s>
            {fmt(t.workspace.cancelledAt, { time: formatTime(booking.startsAt, locale, timeZone) })}
          </s>
          {withMember}
        </p>
      ) : (
        <p className="queue-row__meta">{meta}</p>
      )}

      {origin ? <p className="queue-row__origin">{origin}</p> : null}

      {kind === 'cancelled' && booking.cancellationReason ? (
        <p className="queue-row__reason">“{booking.cancellationReason}”</p>
      ) : null}

      {kind === 'pending' ? (
        <div className="queue-row__actions">
          <Button size="sm" variant="secondary" disabled={busy} onClick={onConfirm}>
            <Icon name="check" className="ico-16" />
            <span>{t.bookings.confirm}</span>
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onDecline}>
            {t.bookings.decline}
          </Button>
          {/* Позвонить — с краю и значком: иногда быстрее спросить, чем
              решать за клиента. */}
          {booking.guestPhone ? (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="queue-row__call"
              aria-label={t.bookings.callClient}
            >
              <a href={telLink(booking.guestPhone)}>
                <Icon name="phone" className="ico-18" />
              </a>
            </Button>
          ) : null}
        </div>
      ) : kind === 'ended' ? (
        <div className="queue-row__actions">
          <Button size="sm" variant="secondary" disabled={busy} onClick={onComplete}>
            <Icon name="check" className="ico-16" />
            <span>{t.bookings.markCompleted}</span>
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onNoShow}>
            {t.bookings.markNoShow}
          </Button>
        </div>
      ) : null}
    </li>
  );
}
