'use client';

/**
 * «Что нового» — колокольчик кабинета (спецификация дашборда §57).
 *
 * Два события, о которых мастер узнаёт не по своему нажатию: клиент записался
 * сам и клиент отменил. Всё остальное в кабинете происходит по её собственным
 * действиям, и лента из них была бы эхом.
 *
 * Прочитанное помнит браузер — это привычка устройства, как вид календаря, а
 * не состояние аккаунта. Открыть ленту и значит прочитать: подсвечено в ней
 * то, что пришло после прошлого взгляда. Опрос раз в минуту — тем же ключом
 * `['bookings', slug, …]`, поэтому любое действие с записью обновляет и ленту.
 */
import * as Popover from '@radix-ui/react-popover';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { listActivity, unreadCount, unreadSince } from '@/features/bookings/activity';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import { useLocalValue } from '@/lib/use-local-value';

import { Icon } from './icon';

export function ActivityBell({ slug }: { slug: string }) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useLocalValue(`amolie:activity-seen:${slug}`);
  /* Порог «нового» на время открытой ленты — снимок до отметки «прочитано»:
     иначе подсветка гасла бы в тот же кадр, в который ленту открыли. */
  const [threshold, setThreshold] = useState(0);

  const query = useQuery({
    queryKey: ['bookings', slug, 'activity'],
    queryFn: () => listActivity(slug),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const events = query.data ?? [];
  const unread = lastSeen === undefined ? 0 : unreadCount(events, lastSeen);

  function onOpenChange(next: boolean) {
    if (next) {
      setThreshold(unreadSince(lastSeen ?? null));
      setLastSeen(new Date().toISOString());
    }
    setOpen(next);
  }

  const when = (iso: string) =>
    formatDateTime(
      iso,
      locale,
      { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
      timeZone,
    );

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="btn btn-secondary btn-icon activity-bell"
          aria-label={
            unread ? fmt(t.workspace.activityUnread, { count: unread }) : t.workspace.activityTitle
          }
        >
          <Icon name="bell" className="ico-18" />
          {unread ? <span className="activity-bell__dot" aria-hidden="true" /> : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="amolie-app activity-panel"
          align="end"
          sideOffset={8}
          collisionPadding={16}
          aria-label={t.workspace.activityTitle}
        >
          <p className="activity-panel__title">{t.workspace.activityTitle}</p>

          {query.isError ? (
            <p className="t-meta activity-panel__note">{describeApiError(query.error, t)}</p>
          ) : events.length === 0 ? (
            <p className="t-meta activity-panel__note">
              {query.isPending ? t.common.loading : t.workspace.activityEmpty}
            </p>
          ) : (
            <ul className="activity-panel__list">
              {events.map((event) => {
                const fresh = Date.parse(event.at) > threshold;
                const cancelled = event.kind === 'cancelled';
                return (
                  <li key={`${event.kind}-${event.booking.id}`}>
                    <Link
                      href={`/${slug}/dashboard/bookings?booking=${event.booking.id}`}
                      className={fresh ? 'activity-row is-fresh' : 'activity-row'}
                      onClick={() => setOpen(false)}
                    >
                      <span
                        className={
                          cancelled ? 'activity-row__icon is-cancelled' : 'activity-row__icon'
                        }
                        aria-hidden="true"
                      >
                        <Icon name={cancelled ? 'xCircle' : 'calendarPlus'} className="ico-16" />
                      </span>
                      <span className="activity-row__text">
                        <span className="activity-row__head">
                          {cancelled ? t.workspace.activityCancelled : t.workspace.activityBooked}
                          {' · '}
                          {event.booking.guestName || t.home.guest}
                        </span>
                        <span className="t-meta">
                          {event.booking.items.map((item) => item.serviceNameSnapshot).join(' + ')}
                          {' · '}
                          {when(event.booking.startsAt)}
                        </span>
                      </span>
                      <span className="t-meta activity-row__at">{when(event.at)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            className="activity-panel__all"
            href={`/${slug}/dashboard/bookings`}
            onClick={() => setOpen(false)}
          >
            {t.workspace.activityAll}
          </Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
