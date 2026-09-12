'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { FreeTime } from '@/components/cabinet/free-time';
import { Button } from '@/components/ui/button';
import { CardHint, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { updateBookingStatus } from '@/features/bookings/api';
import { BookingSheets } from '@/features/bookings/components/booking-sheets';
import { QueueRow } from '@/features/bookings/components/queue-row';
import { VisitRow } from '@/features/bookings/components/visit-row';
import type { Booking } from '@/features/bookings/types';
import { useBookingSheets } from '@/features/bookings/use-booking-sheets';
import { MemberAvatar } from '@/features/dashboard-shell/components/member-avatar';
import { frontDeskModel } from '@/features/front-desk/front-desk-model';
import { deleteSlot } from '@/features/scheduling/api';
import { useSlotMutations } from '@/features/scheduling/use-slot-mutations';
import { serviceTone } from '@/features/services/service-tone';
import type { TeamMember } from '@/features/team/types';
import { describeApiError } from '@/lib/describe-api-error';
import { formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import type { TodayGap } from '../today-model';
import { NextVisitCard } from './next-visit-card';
import { TeamInvitePrompt } from './team-invite-prompt';

const HALF_HOUR = 30 * 60_000;

export interface HomeBoardProps {
  slug: string;
  /** Визиты сегодня в порядке начала (активные статусы). */
  today: Booking[];
  /** Непринятые — все даты. */
  pending: Booking[];
  /** Отменённые клиентом сегодня, ещё впереди. */
  cancelled: Booking[];
  /** Ближайший визит — идущий или следующий. */
  next: Booking | null;
  /** Открытое время сегодня отрезками. */
  intervals: { startsAt: string; minutes: number; memberId: string }[];
  gap: TodayGap | null;
  openAhead: boolean;
  /** Команда сегодня — только там, где виден весь салон. */
  team: TeamMember[] | null;
  /** Часы каждого сегодня по опубликованным окнам: «09:00–18:00». */
  memberHours: Record<string, string>;
  canManageTeam: boolean;
  /** Своё ли это время — подсказка «Свободно 12:00–14:00» и её кнопка. */
  ownDay: boolean;
  setupPending: boolean;
}

/**
 * Модули главной H3–H7 одной клиентской композицией (Design System V2 §8):
 * сейчас/дальше, «Нужен ответ», «Сегодня», «Время», «Команда сегодня».
 *
 * Одной, а не пятью: у визита одна карточка и один набор шторок, и держать
 * их в каждом модуле отдельно значило бы открывать две карточки на один
 * визит. Данные приходят с сервера пропсами; действия — те же мутации, что у
 * календаря, и после каждой экран перечитывает день.
 */
export function HomeBoard({
  slug,
  today,
  pending,
  cancelled,
  next,
  intervals,
  gap,
  openAhead,
  team,
  memberHours,
  canManageTeam,
  ownDay,
  setupPending,
}: HomeBoardProps) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const router = useRouter();
  const toast = useToast();
  const cache = useQueryClient();
  const base = `/${slug}/dashboard`;

  /* Минута — шаг главной: визит сам переходит из «дальше» в «в кресле» и в
     «ждут отметки», как на стойке. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const everything = useMemo(
    () =>
      [...today, ...pending, ...cancelled].filter(
        (b, i, all) => all.findIndex((x) => x.id === b.id) === i,
      ),
    [today, pending, cancelled],
  );
  const sheets = useBookingSheets(slug, everything, {
    /* Главная собрана на сервере: после действия день перечитывается. */
    onChanged: () => router.refresh(),
  });

  const desk = useMemo(() => frontDeskModel(today, now), [today, now]);
  const nameOf = useMemo(
    () => new Map((team ?? []).map((member) => [member.id, member.name])),
    [team],
  );
  const teamMode = team !== null && (team?.filter((m) => m.status === 'active').length ?? 0) > 1;
  const memberName = (booking: Booking) =>
    teamMode ? nameOf.get(booking.organizationMemberId) : undefined;
  const toneOf = (booking: Booking) => serviceTone(booking.items[0]?.serviceId ?? booking.id);

  /* «Все завершены» — по одному запросу на визит; тост с отменой возвращает
     каждому прежний статус. */
  const completeAll = useMutation({
    mutationFn: async (visits: Booking[]) => {
      for (const visit of visits) await updateBookingStatus(slug, visit.id, 'completed');
      return visits;
    },
    onSuccess: (visits) => {
      void cache.invalidateQueries({ queryKey: ['bookings', slug] });
      router.refresh();
      toast({
        message: fmt(t.workspace.allCompletedDone, { count: visits.length }),
        actionLabel: t.common.undo,
        onAction: () =>
          void Promise.all(
            visits.map((visit) => updateBookingStatus(slug, visit.id, visit.status)),
          ).then(
            () => {
              void cache.invalidateQueries({ queryKey: ['bookings', slug] });
              router.refresh();
            },
            (error: unknown) => toast({ message: describeApiError(error, t), tone: 'danger' }),
          ),
      });
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  /* Открыть время одним нажатием (approved N-3): окна по полчаса на весь
     отрезок, «Отменить» снимает ровно созданные. */
  const slots = useSlotMutations(slug);
  async function openGap(range: TodayGap) {
    const times: string[] = [];
    for (
      let at = new Date(range.from).getTime();
      at < new Date(range.to).getTime();
      at += HALF_HOUR
    ) {
      if (at > now) times.push(new Date(at).toISOString());
    }
    if (!times.length) return;
    try {
      const result = await slots.publishMany.mutateAsync({ startsAt: times });
      router.refresh();
      toast({
        message: fmt(t.workspace.gapOpened, {
          from: formatTime(range.from, locale, timeZone),
          to: formatTime(range.to, locale, timeZone),
        }),
        actionLabel: t.common.undo,
        onAction: () =>
          void Promise.all(result.created.map((slot) => deleteSlot(slug, slot.id))).then(
            () => {
              void cache.invalidateQueries({ queryKey: ['slots', slug] });
              router.refresh();
            },
            (error: unknown) => toast({ message: describeApiError(error, t), tone: 'danger' }),
          ),
      });
    } catch {
      /* Отказ уже назван тостом мутации. */
    }
  }

  const queueCount = pending.length + desk.awaiting.length + cancelled.length;
  const time = (iso: string) => formatTime(iso, locale, timeZone);
  const gapLabel = gap
    ? fmt(t.workspace.freeGap, { from: time(gap.from), to: time(gap.to) })
    : null;
  const showTime = (ownDay && gap) || !openAhead;
  const working = (team ?? []).filter(
    (member) =>
      member.status === 'active' &&
      (member.bookingsToday > 0 || intervals.some((interval) => interval.memberId === member.id)),
  );

  /* Строки дня: визиты и свободные отрезки по времени — день один раз. */
  const dayRows = useMemo(() => {
    const rows = [
      ...today.map((booking) => ({ kind: 'booking' as const, at: booking.startsAt, booking })),
      ...(teamMode
        ? []
        : intervals.map((interval) => ({ kind: 'gap' as const, at: interval.startsAt, interval }))),
    ];
    return rows.sort((a, b) => a.at.localeCompare(b.at));
  }, [today, intervals, teamMode]);

  const visitRow = (booking: Booking, register: 'spacious' | 'team', action?: React.ReactNode) => {
    const minutes =
      booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) || 30;
    const ended = new Date(booking.startsAt).getTime() + minutes * 60_000 <= now;
    return (
      <VisitRow
        key={booking.id}
        startsAt={booking.startsAt}
        minutes={minutes}
        clientName={booking.guestName || t.home.guest}
        serviceName={booking.items.map((item) => item.serviceNameSnapshot).join(' + ')}
        tone={toneOf(booking)}
        status={booking.status}
        memberName={memberName(booking)}
        register={register}
        past={register === 'spacious' && (ended || booking.status === 'completed')}
        onOpen={() => sheets.view(booking.id)}
        action={action}
      />
    );
  };

  return (
    <div className="home-grid" data-team={teamMode ? 'true' : undefined}>
      {/* H3 · сейчас / дальше */}
      <div className="home-area-next">
        {next ? (
          <NextVisitCard
            booking={next}
            tone={toneOf(next)}
            memberName={memberName(next)}
            onOpen={() => sheets.view(next.id)}
          />
        ) : (
          <p className="type-meta home-next-empty">
            {today.length ? t.workspace.dayFinished : t.home.freeDayShort}
          </p>
        )}
      </div>

      {/* H4 · нужен ответ — пустая очередь не занимает места (R-20). */}
      {queueCount ? (
        <section className="home-area-queue home-queue card" aria-labelledby="home-queue-title">
          <div className="home-module__head">
            <div>
              <CardTitle id="home-queue-title" className="home-queue__title">
                {t.workspace.needsAnswer}
                <span className="home-queue__count tnum">{queueCount}</span>
              </CardTitle>
              <CardHint>{t.workspace.needsAnswerHint}</CardHint>
            </div>
            <Link className="link type-meta" href={`${base}/calendar?view=list`}>
              {t.home.all}
            </Link>
          </div>
          <ul className="queue-list">
            {pending.map((booking) => (
              <QueueRow
                key={booking.id}
                kind="pending"
                booking={booking}
                href={`${base}/bookings?booking=${booking.id}`}
                memberName={memberName(booking)}
                busy={sheets.updatingId === booking.id}
                onConfirm={() => sheets.setStatus(booking, 'confirmed')}
                onDecline={() => sheets.setStatus(booking, 'cancelled_by_master')}
              />
            ))}
            {desk.awaiting.map((booking) => (
              <QueueRow
                key={booking.id}
                kind="ended"
                booking={booking}
                href={`${base}/bookings?booking=${booking.id}`}
                memberName={memberName(booking)}
                busy={sheets.updatingId === booking.id || completeAll.isPending}
                onComplete={() => sheets.setStatus(booking, 'completed')}
                onNoShow={() => sheets.setStatus(booking, 'no_show')}
              />
            ))}
            {cancelled.map((booking) => (
              <QueueRow
                key={booking.id}
                kind="cancelled"
                booking={booking}
                href={`${base}/bookings?booking=${booking.id}`}
                memberName={memberName(booking)}
              />
            ))}
          </ul>
          {desk.awaiting.length > 1 ? (
            <Button
              variant="flat"
              size="sm"
              className="home-queue__all"
              disabled={completeAll.isPending}
              onClick={() => completeAll.mutate(desk.awaiting)}
            >
              {fmt(t.workspace.allCompleted, { count: desk.awaiting.length })}
            </Button>
          ) : null}
        </section>
      ) : null}

      {/* H5 · сегодня */}
      <section className="home-area-today home-today card" aria-labelledby="home-today-title">
        <div className="home-module__head">
          <div>
            {/* Не «Сегодня»: так уже называется весь экран в шапке над этим
                модулем, и два одинаковых заголовка друг под другом спорили,
                кто из них главный. */}
            <CardTitle id="home-today-title">{t.home.dayPlan}</CardTitle>
            <CardHint>{teamMode ? t.workspace.todayTeamHint : t.workspace.todayHint}</CardHint>
          </div>
          <Link className="link type-meta" href={`${base}/calendar${teamMode ? '?view=team' : ''}`}>
            {teamMode ? t.schedule.viewTeam : t.home.openCalendar}
          </Link>
        </div>

        {today.length === 0 && intervals.length === 0 ? (
          <EmptyState
            title={t.home.freeDay}
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href={`${base}/calendar?open=1`}>{t.workspace.openTime}</Link>
              </Button>
            }
          />
        ) : teamMode ? (
          <div className="visit-list">
            <p className="visit-list__label type-meta">
              {fmt(t.workspace.inChair, { count: desk.inChair.length })}
            </p>
            {desk.inChair.map((booking) =>
              visitRow(
                booking,
                'team',
                <Button
                  size="pill"
                  variant="secondary"
                  disabled={sheets.updatingId === booking.id}
                  onClick={() => sheets.setStatus(booking, 'completed')}
                >
                  {t.bookings.markCompleted}
                </Button>,
              ),
            )}
            {desk.inChair.length === 0 ? (
              <p className="type-meta visit-list__empty">{t.workspace.deskChairEmpty}</p>
            ) : null}
            <p className="visit-list__label type-meta">
              {fmt(t.workspace.nextGroup, { count: desk.next.length })}
            </p>
            {desk.next.map((booking) =>
              visitRow(
                booking,
                'team',
                booking.status === 'pending' ? (
                  <Button
                    size="pill"
                    disabled={sheets.updatingId === booking.id}
                    onClick={() => sheets.setStatus(booking, 'confirmed')}
                  >
                    {t.bookings.confirm}
                  </Button>
                ) : undefined,
              ),
            )}
            {desk.next.length === 0 ? (
              <p className="type-meta visit-list__empty">{t.workspace.deskNextEmpty}</p>
            ) : null}
          </div>
        ) : (
          <div className="visit-list">
            {dayRows.map((row) =>
              row.kind === 'gap' ? (
                <FreeTime
                  key={`gap-${row.at}`}
                  variant="row"
                  label={`${t.home.freeUntil} ${time(new Date(new Date(row.interval.startsAt).getTime() + row.interval.minutes * 60_000).toISOString())}`}
                  action={
                    ownDay ? (
                      <Button
                        size="pill"
                        onClick={() =>
                          void openGap({
                            from: row.interval.startsAt,
                            to: new Date(
                              new Date(row.interval.startsAt).getTime() +
                                row.interval.minutes * 60_000,
                            ).toISOString(),
                          })
                        }
                      >
                        {t.home.open}
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                visitRow(row.booking, 'spacious')
              ),
            )}
          </div>
        )}
      </section>

      {/* H6 · время — только когда есть что сказать. */}
      {showTime ? (
        <section
          className="home-area-time home-time card"
          aria-labelledby="home-time-title"
          data-tone="free"
        >
          <div className="home-module__head">
            <div>
              <CardTitle id="home-time-title">{t.workspace.timeTitle}</CardTitle>
              <CardHint className="home-time__hint">{t.workspace.timeHint}</CardHint>
            </div>
          </div>
          {ownDay && gap ? (
            <div className="home-time__row">
              <span className="type-strong">{gapLabel}</span>
              <Button
                size="pill"
                disabled={slots.publishMany.isPending}
                onClick={() => void openGap(gap)}
              >
                {t.home.open}
              </Button>
            </div>
          ) : null}
          {!openAhead ? (
            <div className="home-time__row">
              <span className="type-dense">{t.workspace.noTimeAhead}</span>
              <Button asChild variant="raised" size="pill">
                <Link href={`${base}/calendar?open=1`}>{t.workspace.openTime}</Link>
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* H7 · команда сегодня — только салону; одному человеку — приглашение. */}
      {team !== null && canManageTeam ? (
        working.length > 1 ? (
          <section className="home-area-team home-team card" aria-labelledby="home-team-title">
            <div className="home-module__head">
              <div>
                <CardTitle id="home-team-title">{t.workspace.teamToday}</CardTitle>
                <CardHint>{t.workspace.teamTodayHint}</CardHint>
              </div>
              <Link className="link type-meta" href={`${base}/calendar?view=team`}>
                {t.schedule.viewTeam}
              </Link>
            </div>
            <ul className="team-today">
              {working.map((member) => (
                <li key={member.id}>
                  <Link
                    className="team-today__row"
                    href={`${base}/calendar?view=day&member=${member.id}`}
                  >
                    <MemberAvatar
                      className="team-today__avatar"
                      name={member.name}
                      seed={member.id}
                      url={member.avatarUrl}
                      focal={member.avatarFocal}
                    />
                    <span className="team-today__text">
                      <span className="type-strong">{member.name}</span>
                      <span className="type-meta tnum">
                        {member.bookingsToday}{' '}
                        {plural(locale, member.bookingsToday, t.common.bookingForms)}
                        {memberHours[member.id] ? ` · ${memberHours[member.id]}` : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : !setupPending ? (
          <div className="home-area-team">
            <TeamInvitePrompt slug={slug} />
          </div>
        ) : null
      ) : null}

      <BookingSheets {...sheets.props} />
    </div>
  );
}
