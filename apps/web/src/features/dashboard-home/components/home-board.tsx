'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';

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
import { Icon } from '@/features/dashboard-shell/components/icon';
import { MemberAvatar } from '@/features/dashboard-shell/components/member-avatar';
import { openWorkspaceAction } from '@/features/dashboard-shell/workspace-actions';
import { frontDeskModel } from '@/features/front-desk/front-desk-model';
import { deleteSlot } from '@/features/scheduling/api';
import { useSlotMutations } from '@/features/scheduling/use-slot-mutations';
import type { TeamMember } from '@/features/team/types';
import { teamTones } from '@/lib/avatar';
import { describeApiError } from '@/lib/describe-api-error';
import { formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import type { TodayGap } from '../today-model';
import { NextVisitCard } from './next-visit-card';
import { TeamInvitePrompt } from './team-invite-prompt';

const HALF_HOUR = 30 * 60_000;
/** Ниш в «Нужен ответ» — две строки; остальные — в «Записях». */
const QUEUE_VISIBLE = 4;

/** Сколько окон открыто — сегодня, на неделе вперёд и скрытых от клиентов. */
export interface TimeStats {
  today: number;
  ahead: number;
  hidden: number;
}

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
  timeStats: TimeStats;
  /** Команда сегодня — только там, где виден весь салон. */
  team: TeamMember[] | null;
  canManageTeam: boolean;
  canManageCalendar: boolean;
  /** Своё ли это время — строка «Свободно 16:30–18:00» и ячейка «Время». */
  ownDay: boolean;
  setupPending: boolean;
  greeting: string;
  facts: string;
  rail: ReactNode;
  /** Доход дня — тёмная ячейка справа от шапки. */
  income: ReactNode;
  /** Страница записи с QR — в правой колонке. */
  pageCard: ReactNode;
  /** Одна фраза про следующий день — там же, последней. */
  tomorrow: ReactNode;
}

/**
 * «Сегодня» — экран `home` прототипа «Кабинет 2026» одной клиентской
 * композицией.
 *
 * Двенадцать колонок: шапка дня с линейкой суток и ближайшим визитом — восемь,
 * доход — четыре; «Нужен ответ» во всю ширину, если есть кого ждать; «День по
 * порядку» — семь: сейчас в кресле, ждут отметки, дальше (с неоткрытым
 * перерывом строкой); справа — время или команда, страница записи и завтра.
 *
 * Одной композицией, а не модулями: у визита одна карточка и один набор
 * шторок, и держать их в каждом модуле значило бы открывать две карточки на
 * один визит. Данные приходят с сервера пропсами; после действия экран
 * перечитывает день.
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
  timeStats,
  team,
  canManageTeam,
  canManageCalendar,
  ownDay,
  setupPending,
  greeting,
  facts,
  rail,
  income,
  pageCard,
  tomorrow,
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
    onChanged: () => router.refresh(),
  });

  const desk = useMemo(() => frontDeskModel(today, now), [today, now]);
  const nameOf = useMemo(
    /* Первым именем, как в прототипе: «Анна», а не «Анна Берзиня», — строка
       визита и ниша очереди и так тесные. */
    () =>
      new Map((team ?? []).map((member) => [member.id, member.name.split(' ')[0] ?? member.name])),
    [team],
  );
  const teamMode = team !== null && (team?.filter((m) => m.status === 'active').length ?? 0) > 1;
  const memberName = (booking: Booking) =>
    teamMode ? nameOf.get(booking.organizationMemberId) : undefined;
  /* Тон человека — тот же, что на линейке суток: точка в строке визита и в
     «Команде сегодня» совпадает с его отрезком. */
  const tones = useMemo(() => teamTones((team ?? []).map((member) => member.id)), [team]);
  const toneOfMember = (memberId: string) =>
    tones[memberId] ? `var(--tone-${tones[memberId]})` : undefined;

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
      /* Без «Вернуть»: завершение окончательно — по нему считается доход, и
         сервер обратного перехода не даёт. Кнопка, которая всегда отвечала
         отказом, хуже, чем её отсутствие. */
      toast({ message: fmt(t.workspace.allCompletedDone, { count: visits.length }) });
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  /* Открыть перерыв одним нажатием: окна по полчаса на весь отрезок,
     «Отменить» снимает ровно созданные. */
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

  /* Отменённые клиентом стоят в очереди рядом с ждущими: о них мастер иначе
     не узнает вовсе, а освободившееся время можно отдать другому. */
  const queueCount = pending.length + cancelled.length;
  const queueItems = [
    ...pending.map((booking) => ({ kind: 'pending' as const, booking })),
    ...cancelled.map((booking) => ({ kind: 'cancelled' as const, booking })),
  ];
  const time = (iso: string) => formatTime(iso, locale, timeZone);
  const working = (team ?? []).filter(
    (member) =>
      member.status === 'active' &&
      (member.bookingsToday > 0 || intervals.some((interval) => interval.memberId === member.id)),
  );
  const doneCount = today.filter((booking) => booking.status === 'completed').length;

  /* Что с человеком прямо сейчас и как он загружен — из того же дня, что
     уже лежит на экране. */
  const memberState = (memberId: string) => {
    const minutesOf = (booking: Booking) =>
      booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) || 30;
    const own = today
      .filter((booking) => booking.organizationMemberId === memberId)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const busy = own.reduce((sum, booking) => sum + minutesOf(booking), 0);
    const current = own.find((booking) => {
      const start = new Date(booking.startsAt).getTime();
      return (
        start <= now && start + minutesOf(booking) * 60_000 > now && booking.status !== 'completed'
      );
    });
    const upcoming = own.find((booking) => new Date(booking.startsAt).getTime() > now);

    const line = current
      ? fmt(t.workspace.memberInChair, {
          time: time(
            new Date(
              new Date(current.startsAt).getTime() + minutesOf(current) * 60_000,
            ).toISOString(),
          ),
          name: (current.guestName || t.home.guest).split(' ')[0] ?? '',
        })
      : upcoming
        ? fmt(t.workspace.memberNext, { time: time(upcoming.startsAt) })
        : t.workspace.memberFree;

    return { line, count: own.length, hours: String(Math.round((busy / 60) * 10) / 10) };
  };

  const visitRow = (booking: Booking, action?: ReactNode) => {
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
        memberTone={teamMode ? toneOfMember(booking.organizationMemberId) : undefined}
        status={booking.status}
        memberName={memberName(booking)}
        past={ended || booking.status === 'completed'}
        onOpen={() => sheets.view(booking.id)}
        action={action}
      />
    );
  };

  /* «Дальше» — с неоткрытым перерывом строкой перед визитом, которым он
     кончается (`.gap-row` прототипа): свободное время, которое никто не может
     купить, видно там, где оно лежит в дне. */
  const nextRows: ReactNode[] = [];
  let gapPlaced = false;
  for (const booking of desk.next) {
    if (
      ownDay &&
      gap &&
      !gapPlaced &&
      new Date(booking.startsAt).getTime() >= new Date(gap.to).getTime()
    ) {
      gapPlaced = true;
      nextRows.push(
        <div className="gap-row" key="gap">
          <span>{fmt(t.workspace.freeGap, { from: time(gap.from), to: time(gap.to) })}</span>
          <span className="gap-row__line" aria-hidden="true" />
          <Button
            variant="secondary"
            size="pill"
            disabled={slots.publishMany.isPending}
            onClick={() => void openGap(gap)}
          >
            {t.workspace.openForBooking}
          </Button>
        </div>,
      );
    }
    nextRows.push(
      visitRow(
        booking,
        teamMode && booking.status === 'pending' ? (
          <Button
            size="pill"
            variant="secondary"
            disabled={sheets.updatingId === booking.id}
            onClick={() => sheets.setStatus(booking, 'confirmed')}
          >
            {t.bookings.confirm}
          </Button>
        ) : undefined,
      ),
    );
  }

  const showTime = ownDay || !openAhead;

  return (
    <div className="home-grid" data-team={teamMode ? 'true' : undefined}>
      {/* Шапка дня и ближайший визит — одна ячейка: приветствие, факты дня,
          линейка суток и «кто следующий» отвечают на один вопрос — «как
          лежит сегодня». */}
      <section className="home-area-lead home-lead card" aria-labelledby="home-lead-title">
        <div className="home-lead__head">
          <div className="home-lead__titles">
            <h2 id="home-lead-title" className="type-greeting">
              {greeting}
            </h2>
            <p className="type-hint home-lead__facts">{facts}</p>
          </div>
          {queueCount ? (
            <span className="home-lead__chip">
              <Icon name="bell" className="ico-16" />
              {fmt(t.workspace.waitingChip, { count: queueCount })}
            </span>
          ) : null}
        </div>
        {rail}
        {next ? (
          <NextVisitCard
            booking={next}
            memberName={memberName(next)}
            onOpen={() => sheets.view(next.id)}
          />
        ) : (
          <p className="type-meta home-next-empty">
            {today.length ? t.workspace.dayFinished : t.home.freeDayShort}
          </p>
        )}
      </section>

      {income ? <div className="home-area-income">{income}</div> : null}

      {/* Нужен ответ — пустая очередь не занимает места. */}
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
            <Link className="cell-link" href={`${base}/bookings`}>
              {t.workspace.allBookings}
            </Link>
          </div>
          {/* Четыре ниши — две строки: очередь из семнадцати заявок на недели
              вперёд вытесняла весь день ниже экрана. Остальные — в «Записях». */}
          <ul className="queue-list">
            {queueItems
              .slice(0, QUEUE_VISIBLE)
              .map(({ kind, booking }) =>
                kind === 'pending' ? (
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
                ) : (
                  <QueueRow
                    key={booking.id}
                    kind="cancelled"
                    booking={booking}
                    href={`${base}/bookings?booking=${booking.id}`}
                    memberName={memberName(booking)}
                  />
                ),
              )}
          </ul>
          {queueCount > QUEUE_VISIBLE ? (
            <Link className="cell-link home-queue__more" href={`${base}/bookings`}>
              {fmt(t.workspace.queueMore, { count: queueCount - QUEUE_VISIBLE })}
            </Link>
          ) : null}
        </section>
      ) : null}

      <section className="home-area-today home-today card" aria-labelledby="home-today-title">
        <div className="home-module__head">
          <div>
            <CardTitle id="home-today-title">{t.home.dayPlan}</CardTitle>
            <CardHint>{teamMode ? t.workspace.todayTeamHint : t.workspace.todayHint}</CardHint>
          </div>
          <Link className="cell-link" href={`${base}/calendar`}>
            {t.home.openCalendar}
          </Link>
        </div>

        {today.length === 0 && !gap ? (
          <EmptyState
            title={t.home.freeDay}
            action={
              canManageCalendar ? (
                <Button asChild variant="secondary" size="sm">
                  <Link href={`${base}/calendar?open=1`}>{t.workspace.openTime}</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {desk.inChair.length ? (
              <div className="visit-list home-today__now">
                <p className="visit-list__label type-meta">
                  {fmt(t.workspace.inChair, { count: desk.inChair.length })}
                </p>
                {desk.inChair.map((booking) =>
                  visitRow(
                    booking,
                    teamMode ? (
                      <Button
                        size="pill"
                        variant="secondary"
                        disabled={sheets.updatingId === booking.id}
                        onClick={() => sheets.setStatus(booking, 'completed')}
                      >
                        {t.bookings.markCompleted}
                      </Button>
                    ) : undefined,
                  ),
                )}
              </div>
            ) : null}

            {/* Ждут отметки — часть прошедшего дня, а не решение, которого
                кто-то ждёт. «Все завершены» — со второго визита. */}
            {desk.awaiting.length ? (
              <div className="visit-list">
                <p className="visit-list__label type-meta">
                  {fmt(t.workspace.awaitingMark, { count: desk.awaiting.length })}
                </p>
                {desk.awaiting.map((booking) =>
                  visitRow(
                    booking,
                    <>
                      <Button
                        size="pill"
                        variant="secondary"
                        disabled={sheets.updatingId === booking.id || completeAll.isPending}
                        onClick={() => sheets.setStatus(booking, 'completed')}
                      >
                        {t.bookings.markCompleted}
                      </Button>
                      <Button
                        size="pill"
                        variant="ghost"
                        disabled={sheets.updatingId === booking.id || completeAll.isPending}
                        onClick={() => sheets.setStatus(booking, 'no_show')}
                      >
                        {t.bookings.noShow}
                      </Button>
                    </>,
                  ),
                )}
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
              </div>
            ) : null}

            <div className="visit-list">
              <p className="visit-list__label type-meta">
                {fmt(t.workspace.nextGroup, { count: desk.next.length })}
              </p>
              {nextRows}
              {desk.next.length === 0 ? (
                <p className="type-meta visit-list__empty">{t.workspace.dayFinished}</p>
              ) : null}
            </div>
          </>
        )}

        {/* Завершённые не занимают места в дне, но и не пропадают. */}
        {doneCount ? (
          <div className="home-today__done">
            <span className="type-meta">
              {fmt(t.workspace.completedToday, { count: doneCount })}
            </span>
            <Link className="home-today__more" href={`${base}/bookings?status=completed`}>
              {t.workspace.showCompleted}
            </Link>
          </div>
        ) : null}
      </section>

      {/* Правая колонка одним столбцом: время или команда, страница записи,
          завтра. */}
      <div className="home-area-side home-side">
        {showTime ? (
          <section className="home-time card" aria-labelledby="home-time-title">
            <div className="home-module__head">
              <div>
                <CardTitle id="home-time-title">{t.workspace.timeTitle}</CardTitle>
                <CardHint>{t.workspace.timeHint}</CardHint>
              </div>
              <Link className="cell-link" href={`${base}/calendar`}>
                {t.nav.calendar}
              </Link>
            </div>
            <p className="home-time__line">
              {fmt(t.workspace.timeOpenLine, { today: timeStats.today, week: timeStats.ahead })}
              {timeStats.hidden
                ? ` ${fmt(t.workspace.timeHiddenLine, { count: timeStats.hidden })}`
                : ''}
            </p>
            {!openAhead ? <p className="home-time__warn">{t.workspace.noTimeAhead}</p> : null}
            {canManageCalendar ? (
              <div className="home-time__actions">
                <Button asChild variant="secondary" size="sm">
                  <Link href={`${base}/calendar?open=1`}>
                    <Icon name="plus" className="ico-18" />
                    <span>{t.workspace.openTime}</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openWorkspaceAction({ kind: 'block' })}
                >
                  {t.schedule.blockTime}
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Команда сегодня — только салону; одному человеку — приглашение. */}
        {team !== null && canManageTeam ? (
          working.length > 1 ? (
            <section className="home-team card" aria-labelledby="home-team-title">
              <div className="home-module__head">
                <div>
                  <CardTitle id="home-team-title">{t.workspace.teamToday}</CardTitle>
                  <CardHint>{t.workspace.teamTodayHint}</CardHint>
                </div>
                <Link className="cell-link" href={`${base}/calendar?view=team`}>
                  {t.workspace.teamDay}
                </Link>
              </div>
              <ul className="team-today">
                {working.map((member) => {
                  const state = memberState(member.id);
                  return (
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
                          <span className="type-strong">
                            <i
                              className="visit-row__dot"
                              style={{ '--tone': toneOfMember(member.id) } as CSSProperties}
                              aria-hidden="true"
                            />
                            {member.name.split(' ')[0] ?? member.name}
                          </span>
                          <span className="type-meta">{state.line}</span>
                        </span>
                        <span className="type-meta tnum team-today__load">
                          {fmt(t.workspace.memberLoad, {
                            bookings: `${state.count} ${plural(locale, state.count, t.common.bookingForms)}`,
                            hours: state.hours,
                          })}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : !setupPending ? (
            <TeamInvitePrompt slug={slug} />
          ) : null
        ) : null}

        {pageCard}
        {tomorrow}
      </div>

      <BookingSheets {...sheets.props} />
    </div>
  );
}
