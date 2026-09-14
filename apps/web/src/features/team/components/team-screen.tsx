'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, type CSSProperties } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { listBookings } from '@/features/bookings/api';
import type { Booking } from '@/features/bookings/types';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { MemberAvatar } from '@/features/dashboard-shell/components/member-avatar';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { minutesOfDay } from '@/features/scheduling/calendar-model';
import { memberTone } from '@/lib/avatar';
import { FALLBACK_TIMEZONE, addDaysToKey, mondayOfKey, todayKey } from '@/lib/civil-date';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { dayWindow, fromDayWindow } from '@/lib/time-window';
import { useTimeZone } from '@/lib/timezone';

import { inviteMember, listInvites, listTeam, revokeInvite } from '../api';
import type { AssignableRole, TeamMember } from '../types';
import { InviteSheet } from './invite-sheet';
import { roleName } from './role-badge';

/** Линейка дня на карточке — с 08:00 до 21:00, как линейка «Сегодня». */
const RAIL_FROM = 8 * 60;
const RAIL_TO = 21 * 60;

/** Визиты, которые время не занимают, — ни в линейку, ни в загрузку. */
const OFF = new Set<Booking['status']>(['cancelled_by_client', 'cancelled_by_master', 'expired']);

const minutesOf = (booking: Booking) =>
  booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) || 30;

const railPct = (minutes: number) =>
  `${Math.max(0, Math.min(100, ((minutes - RAIL_FROM) / (RAIL_TO - RAIL_FROM)) * 100)).toFixed(2)}%`;

/**
 * «Команда» — прототип «Кабинет 2026», экран `team`.
 *
 * Карточка на человека: портрет в тоне человека, имя и роль, сколько у него
 * записей сегодня и линейка его дня — занятое тоном, прошедшее тише, черта
 * «сейчас». Администратор по сетке видит, кто занят и кто свободен, не
 * открывая календарь. Карточка ведёт на страницу человека; роль,
 * отстранение и возврат живут там, рядом с тем, что они меняют.
 *
 * Под сеткой — приглашения, которые ещё ждут ответа (человек, которому
 * отправили письмо, в салоне ещё не работает, и мешать его с составом —
 * врать про состав), и загрузка недели по часам.
 */
export function TeamScreen({
  slug,
  startInviting = false,
}: {
  slug: string;
  /** Открыть приглашение сразу — пришли из «Добавить мастера». */
  startInviting?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const toast = useToast();
  const cache = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(startInviting);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const today = todayKey(timeZone);
  const monday = mondayOfKey(today);

  const team = useQuery({
    queryKey: ['team', slug],
    queryFn: () => listTeam(slug, dayWindow(new Date(), timeZone)),
  });
  const invites = useQuery({
    queryKey: ['team-invites', slug],
    queryFn: () => listInvites(slug),
  });
  /* Визиты недели — одной выборкой на линейки дня и на загрузку: сегодня
     лежит внутри недели, и второй запрос за теми же записями не нужен. */
  const week = useQuery({
    queryKey: ['bookings', slug, 'team-week', monday],
    queryFn: () =>
      listBookings(slug, {
        ...fromDayWindow(monday, timeZone),
        to: fromDayWindow(addDaysToKey(monday, 7), timeZone).from,
      }),
  });

  const refresh = () =>
    Promise.all([
      cache.invalidateQueries({ queryKey: ['team', slug] }),
      cache.invalidateQueries({ queryKey: ['team-invites', slug] }),
    ]);

  const invite = useMutation({
    mutationFn: (input: { email: string; role: AssignableRole; displayName: string }) =>
      inviteMember(slug, input),
    onSuccess: async () => {
      await refresh();
      setInviteOpen(false);
      setInviteError(null);
      toast({ message: t.team.sent });
    },
    /* Отказ остаётся в шторке строкой под полями: почти каждая причина — про
       то, что только что ввели, и закрывать форму значит набирать заново. */
    onError: (error) => setInviteError(describeApiError(error, t)),
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => revokeInvite(slug, inviteId),
    onSuccess: async () => {
      await refresh();
      setRevoking(null);
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const header = (
    <PageHeader
      title={t.team.title}
      meta={t.team.subtitle}
      actions={
        <Button size="sm" className="page-action--create" onClick={() => setInviteOpen(true)}>
          <Icon name="plus" className="ico-18" />
          <span>{t.team.invite}</span>
        </Button>
      }
    />
  );

  if (team.isError || invites.isError)
    return (
      <>
        {header}
        <LoadError
          onRetry={() => {
            void team.refetch();
            void invites.refetch();
          }}
        />
      </>
    );

  const members = team.data ?? [];
  const pending = invites.data ?? [];
  const alone = members.filter((member) => member.status !== 'disabled').length <= 1;

  const dayOf = (iso: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso));
  const weekBookings = (week.data ?? []).filter((booking) => !OFF.has(booking.status));
  /* Минуты суток — в поясе заведения; без него — в запасном, как у календаря. */
  const zone = timeZone ?? FALLBACK_TIMEZONE;
  const nowMinutes = minutesOfDay(new Date().toISOString(), zone);

  const toneOf = (member: TeamMember) =>
    ({ '--member': `var(--tone-${memberTone(member.id)})` }) as CSSProperties;

  /* Загрузка недели — занятые часы работающих, от самой плотной. */
  const load = members
    .filter((member) => member.status === 'active')
    .map((member) => ({
      member,
      minutes: weekBookings
        .filter((booking) => booking.organizationMemberId === member.id)
        .reduce((sum, booking) => sum + minutesOf(booking), 0),
    }))
    .filter((row) => row.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
  const maxLoad = Math.max(1, ...load.map((row) => row.minutes));

  return (
    <>
      {header}

      {team.isPending || invites.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="team-grid">
            {members.map((member) => {
              const own = weekBookings.filter(
                (booking) =>
                  booking.organizationMemberId === member.id && dayOf(booking.startsAt) === today,
              );
              return (
                <Link
                  key={member.id}
                  href={`/${slug}/dashboard/team/${member.id}`}
                  className={member.status === 'disabled' ? 'member-tile is-off' : 'member-tile'}
                  style={toneOf(member)}
                >
                  <MemberAvatar
                    className="member-tile__avatar"
                    name={member.name}
                    seed={member.id}
                    url={member.avatarUrl}
                    focal={member.avatarFocal}
                  />
                  <span className="member-tile__text">
                    <b>{member.name}</b>
                    <span>
                      {roleName(member.role, t)}
                      {member.status === 'disabled' ? ` · ${t.team.statusDisabled}` : ''}
                    </span>
                  </span>
                  <span className="member-tile__load">
                    <b className="tnum">{member.bookingsToday}</b>
                    {plural(locale, member.bookingsToday, t.common.bookingForms)} {t.team.todayWord}
                  </span>
                  {/* Линейка дня — занятое тоном человека, прошедшее тише,
                      черта «сейчас». Цифры уже сказаны справа, линейка
                      показывает, где в дне они лежат. */}
                  <span className="member-tile__rail" aria-hidden="true">
                    {own.map((booking) => {
                      const start = minutesOfDay(booking.startsAt, zone);
                      const end = start + minutesOf(booking);
                      return (
                        <i
                          key={booking.id}
                          className={booking.status === 'completed' ? 'is-done' : undefined}
                          style={{
                            left: railPct(start),
                            width: `calc(${railPct(end)} - ${railPct(start)})`,
                          }}
                        />
                      );
                    })}
                    {nowMinutes > RAIL_FROM && nowMinutes < RAIL_TO ? (
                      <i className="is-now" style={{ left: railPct(nowMinutes) }} />
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </div>

          {pending.length ? (
            <Card className="team-section">
              <CardHeader>
                <div>
                  <CardTitle>{t.team.pending}</CardTitle>
                  <CardHint>{t.team.pendingHint}</CardHint>
                </div>
              </CardHeader>
              <div className="team-invites">
                {pending.map((row) => (
                  <div className="team-invite" key={row.id}>
                    <span className="list-avatar team-invite__avatar" aria-hidden="true">
                      <Icon name="mail" className="ico-16" />
                    </span>
                    <span className="team-invite__text">
                      <b>{row.displayName || row.email}</b>
                      <span>
                        {roleName(row.role, t)} ·{' '}
                        {fmt(t.team.invitedAt, {
                          date: formatDate(row.createdAt, locale, timeZone),
                        })}
                      </span>
                    </span>
                    <Button variant="ghost" size="pill" onClick={() => setRevoking(row.id)}>
                      {t.team.revoke}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {load.length ? (
            <Card className="team-section">
              <CardHeader>
                <div>
                  <CardTitle>{t.team.weekLoadTitle}</CardTitle>
                  <CardHint>{t.team.weekLoadHint}</CardHint>
                </div>
              </CardHeader>
              <div className="hbars">
                {load.map(({ member, minutes }) => (
                  <div className="hbar" key={member.id} style={toneOf(member)}>
                    <span className="hbar__name">{member.name}</span>
                    <span className="hbar__val tnum">
                      {Math.round((minutes / 60) * 10) / 10} {t.common.hoursShort}
                    </span>
                    <span className="hbar__track">
                      <i style={{ width: `${Math.round((minutes / maxLoad) * 100)}%` }} />
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {alone && !pending.length ? (
            <Card className="team-section team-solo">
              <CardTitle>{t.team.soloTitle}</CardTitle>
              <CardHint>{t.team.soloBody}</CardHint>
              <Button variant="secondary" size="sm" onClick={() => setInviteOpen(true)}>
                <Icon name="plus" className="ico-18" />
                <span>{t.team.invite}</span>
              </Button>
            </Card>
          ) : null}
        </>
      )}

      <InviteSheet
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) setInviteError(null);
        }}
        onSubmit={(input) => invite.mutate(input)}
        submitting={invite.isPending}
        error={inviteError}
      />

      <ConfirmSheet
        open={Boolean(revoking)}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={t.team.revokeTitle}
        description={t.team.revokeBody}
        confirmLabel={t.team.revoke}
        loading={revokeMutation.isPending}
        onConfirm={() => revoking && revokeMutation.mutate(revoking)}
      />
    </>
  );
}
