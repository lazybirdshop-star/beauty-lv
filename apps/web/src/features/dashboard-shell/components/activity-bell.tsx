'use client';

/**
 * «Что нового» — колокольчик кабинета (спецификация дашборда §57), шторка
 * `activity` прототипа «Кабинет 2026».
 *
 * Два события, о которых мастер узнаёт не по своему нажатию: клиент записался
 * сам и клиент отменил. Всё остальное в кабинете происходит по её собственным
 * действиям, и лента из них была бы эхом.
 *
 * Строка — точка непрочитанного, имя, когда это случилось, и что именно:
 * «Новая запись · Маникюр, завтра 15:00». Глаголы прототипа («Записалась»,
 * «Отменила») заменены событием: пол клиента по имени не угадать.
 *
 * Прочитанное помнит браузер — это привычка устройства, как вид календаря, а
 * не состояние аккаунта. Открыть ленту и значит прочитать: подсвечено в ней
 * то, что пришло после прошлого взгляда. Опрос раз в минуту — тем же ключом
 * `['bookings', slug, …]`, поэтому любое действие с записью обновляет и ленту.
 */
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { listActivity, unreadCount, unreadSince } from '@/features/bookings/activity';
import { describeApiError } from '@/lib/describe-api-error';
import { dayKey, formatDayShort, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import { useLocalValue } from '@/lib/use-local-value';
import { useNow } from '@/lib/use-now';
import { cn } from '@/lib/utils';

import { Icon } from './icon';

const DAY_MS = 86_400_000;

export function ActivityBell({ slug }: { slug: string }) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const now = useNow();
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

  /* «сегодня 09:31», «вчера 21:40», «завтра 15:00», иначе «11 сен 09:12». */
  const when = (iso: string) => {
    const time = formatTime(iso, locale, timeZone);
    const key = dayKey(iso, timeZone);
    if (now !== null) {
      if (key === dayKey(new Date(now), timeZone)) {
        return `${t.bookings.today.toLocaleLowerCase(locale)} ${time}`;
      }
      if (key === dayKey(new Date(now - DAY_MS), timeZone)) {
        return `${t.workspace.activityYesterday} ${time}`;
      }
      if (key === dayKey(new Date(now + DAY_MS), timeZone)) {
        return `${t.bookings.tomorrow.toLocaleLowerCase(locale)} ${time}`;
      }
    }
    return `${formatDayShort(iso, locale, timeZone, false)} ${time}`;
  };

  return (
    <>
      <Button
        variant="raised"
        size="icon"
        className="activity-bell"
        aria-label={
          unread ? fmt(t.workspace.activityUnread, { count: unread }) : t.workspace.activityTitle
        }
        onClick={() => onOpenChange(true)}
      >
        <Icon name="bell" className="ico-18" />
        {unread ? <span className="activity-bell__dot" aria-hidden="true" /> : null}
      </Button>

      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={t.workspace.activityTitle}
        description={t.workspace.activityHint}
        footer={
          <>
            {/* Закрывает шторку крестик — второй «Закрыть» в подвале не нужен.
                Переход к записям — главное действие шторки. */}
            <Button asChild>
              <Link href={`/${slug}/dashboard/bookings`} onClick={() => setOpen(false)}>
                {t.workspace.activityAll}
              </Link>
            </Button>
          </>
        }
      >
        {query.isError ? (
          <p className="form-field__hint">{describeApiError(query.error, t)}</p>
        ) : events.length === 0 ? (
          <p className="form-field__hint">
            {query.isPending ? t.common.loading : t.workspace.activityEmpty}
          </p>
        ) : (
          <div className="activity-list">
            {events.map((event) => {
              const fresh = Date.parse(event.at) > threshold;
              const services = event.booking.items
                .map((item) => item.serviceNameSnapshot)
                .join(' + ');
              return (
                <Link
                  key={`${event.kind}-${event.booking.id}`}
                  href={`/${slug}/dashboard/bookings?booking=${event.booking.id}`}
                  className={cn(
                    'activity-row',
                    fresh && 'is-fresh',
                    event.kind === 'cancelled' && 'is-cancelled',
                  )}
                  onClick={() => setOpen(false)}
                >
                  <i className="activity-row__dot" aria-hidden="true" />
                  <b className="activity-row__who">{event.booking.guestName || t.home.guest}</b>
                  <span className="activity-row__when tnum">{when(event.at)}</span>
                  <span className="activity-row__what">
                    <span className="activity-row__kind">
                      {event.kind === 'cancelled'
                        ? t.workspace.activityCancelled
                        : t.workspace.activityBooked}
                    </span>
                    {' · '}
                    {services}, {when(event.booking.startsAt)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Sheet>
    </>
  );
}
