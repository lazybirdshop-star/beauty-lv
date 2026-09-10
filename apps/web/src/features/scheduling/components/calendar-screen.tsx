'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { useNarrow } from '@/features/dashboard-shell/use-narrow';
import { openWorkspaceAction } from '@/features/dashboard-shell/workspace-actions';
import { useWorkspace } from '@/features/dashboard-shell/workspace-context';
import { useTeamRoster } from '@/features/team/use-team-roster';
import { FALLBACK_TIMEZONE } from '@/lib/civil-date';
import { describeApiError } from '@/lib/describe-api-error';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { fromDayWindow } from '@/lib/time-window';
import { useTimeZone } from '@/lib/timezone';

import { listBookings } from '../../bookings/api';
import { deleteSlot, listSlots } from '../api';
import {
  bookingEntries,
  placeEntries,
  resolveView,
  restoreVisible,
  teamColumns,
  toggleVisible,
  weekColumns,
  type CalendarView,
  type GridColumn,
} from '../calendar-columns';
import { SLOT_MINUTES, clock } from '../calendar-model';
import { useCalendarPreferences } from '../calendar-preferences';
import { instantAt } from '../grid-geometry';
import { useBookingMove } from '../use-booking-move';
import { useSlotMutations } from '../use-slot-mutations';
import {
  addDaysToKey,
  buildWeek,
  expandSlotTimes,
  formatDayLabel,
  formatWeekRange,
  mondayOfKey,
  todayKey,
} from '../week';
import { AvailabilitySheet } from './availability-sheet';
import { BulkClearSheet } from './bulk-clear-sheet';
import { BulkPublishSheet } from './bulk-publish-sheet';
import { CalendarAgenda } from './calendar-agenda';
import { CalendarGrid, type GridInteractions } from './calendar-grid';
import { CalendarQuickActions, type QuickTarget } from './calendar-quick-actions';
import { CalendarToolbar } from './calendar-toolbar';
import { DayStrip } from './day-strip';
import { SlotDetailSheet } from './slot-detail-sheet';
import { TeamFilter } from './team-filter';

/** Двигать можно то, что ещё впереди и ещё не закрыто. */
const MOVABLE = new Set(['pending', 'confirmed']);

/**
 * Календарь — главный экран продукта (спецификация §10).
 *
 * Один экран на соло-мастера и на салон. Соло видит день, неделю и список
 * своего времени; у того, кто ведёт команду, появляется командный день —
 * колонка на человека — и выбор, чьё время смотреть в дне и неделе. Решает не
 * тип организации, а число работающих и право видеть чужое время.
 */
export function CalendarScreen({ slug }: { slug: string }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeZone = useTimeZone() ?? FALLBACK_TIMEZONE;
  const narrow = useNarrow();
  const toast = useToast();
  const cache = useQueryClient();

  const workspace = useWorkspace();
  const selfId = workspace?.memberId ?? null;
  const teamAvailable = Boolean(workspace?.capabilities.canViewTeamCalendar);
  const canActForOthers = Boolean(workspace?.capabilities.canManageOthersSchedule);

  const [preferences, remember] = useCalendarPreferences(slug);
  const roster = useTeamRoster(slug, teamAvailable);
  const members = useMemo(() => roster.data ?? [], [roster.data]);
  const working = useMemo(() => members.filter((member) => member.status === 'active'), [members]);
  const workingIds = useMemo(() => working.map((member) => member.id), [working]);

  const view = resolveView(searchParams.get('view'), preferences.view, { teamAvailable, narrow });
  const views: CalendarView[] = narrow
    ? ['day', 'list']
    : teamAvailable
      ? ['team', 'day', 'week', 'list']
      : ['day', 'week', 'list'];

  function setView(next: CalendarView) {
    /* Выбор на телефоне не запоминается: там сетка — всегда день, и привычка
       телефона перебила бы привычку большого экрана. */
    if (!narrow) remember({ view: next });
    router.replace(`/${slug}/dashboard/calendar?view=${next}`, { scroll: false });
  }

  /* Чьё время в дне и неделе. Без команды вопроса нет: сервер и так отдаёт
     только своё или только одно. Ушедший из команды выбор сбрасывается к себе. */
  const personId = teamAvailable
    ? preferences.personId && workingIds.includes(preferences.personId)
      ? preferences.personId
      : selfId
    : null;
  const visible = useMemo(
    () => restoreVisible(preferences.visible, workingIds),
    [preferences.visible, workingIds],
  );
  const nameOf = (memberId: string | null) =>
    members.find((member) => member.id === memberId)?.name;

  /* Якорь — гражданская дата салона, а не момент времени: «следующая неделя»
     это плюс семь клеток календаря, и перевод стрелок в неё не лезет. */
  const [anchor, setAnchor] = useState(() => todayKey(timeZone));

  /*
   * Сколько прошлого экран просит у сервера.
   *
   * Не «всё»: окна копятся всё время, что мастер работает. Нижняя граница —
   * понедельник самой ранней недели, до которой долистали; шаг назад расширяет
   * окно. Верхней границы нет: будущее ограничено тем, что открыто.
   */
  const [earliestWeek, setEarliestWeek] = useState(() => mondayOfKey(todayKey(timeZone)));
  const slotsWindow = fromDayWindow(earliestWeek, timeZone);

  const slotsQuery = useQuery({
    /* Граница окна — в ключе: иначе расширенный запрос получил бы из кэша
       прежний, укороченный ответ. */
    queryKey: ['slots', slug, earliestWeek],
    queryFn: () => listSlots(slug, slotsWindow),
    placeholderData: (previous) => previous,
  });
  const bookingsQuery = useQuery({
    queryKey: ['bookings', slug, earliestWeek],
    queryFn: () => listBookings(slug, slotsWindow),
    placeholderData: (previous) => previous,
  });
  const slots = slotsQuery.data;
  const bookings = bookingsQuery.data;
  const mutations = useSlotMutations(slug);
  const { move } = useBookingMove(slug);

  const [quick, setQuick] = useState<QuickTarget | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  /* Шторка рабочего времени: за кого и на какую клетку. `null` — закрыта. */
  const [availability, setAvailability] = useState<{
    ownerId: string | null;
    draft?: { date: string; time: string };
  } | null>(null);
  /* Период открывают за того же человека, за кого была открыта шторка. */
  const [period, setPeriod] = useState<{
    kind: 'publish' | 'clear';
    ownerId: string | null;
  } | null>(null);

  const requestedOpen = searchParams.get('open') === '1';
  const availabilityOpen = availability !== null || requestedOpen;
  const availabilityOwner = availability?.ownerId ?? personId ?? selfId;

  /* За себя поле не отправляется: право на чужое расписание для этого не
     нужно, и лишний идентификатор в запросе — лишний повод для отказа. */
  const forApi = (ownerId: string | null) => (ownerId && ownerId !== selfId ? ownerId : undefined);

  function closeAvailability() {
    setAvailability(null);
    if (requestedOpen)
      router.replace(`/${slug}/dashboard/calendar?view=${view}`, { scroll: false });
  }

  const weekDays = useMemo(
    () => buildWeek(anchor, slots ?? [], locale, timeZone),
    [anchor, slots, locale, timeZone],
  );
  const anchorDay = weekDays.find((day) => day.dateKey === anchor) ?? weekDays[0]!;

  const entries = useMemo(
    () => bookingEntries(bookings ?? [], timeZone, t.home.guest),
    [bookings, timeZone, t.home.guest],
  );
  const placed = useMemo(
    () => placeEntries(entries, view, { dateKey: anchor, personId }),
    [entries, view, anchor, personId],
  );

  const columns = useMemo<GridColumn[]>(() => {
    if (view === 'team') {
      return teamColumns(
        anchorDay,
        members,
        visible,
        entries,
        (count) => `${count} ${plural(locale, count, t.common.bookingForms)}`,
      );
    }
    return weekColumns(view === 'day' ? [anchorDay] : weekDays, personId);
  }, [
    view,
    anchorDay,
    members,
    visible,
    entries,
    locale,
    t.common.bookingForms,
    weekDays,
    personId,
  ]);

  const selectedSlot = slots?.find((slot) => slot.id === selectedSlotId) ?? null;
  const selectedBooking =
    bookings?.find(
      (booking) =>
        booking.publishedSlotId === selectedSlotId &&
        booking.status !== 'cancelled_by_client' &&
        booking.status !== 'cancelled_by_master',
    ) ?? null;

  const stepsWeek = view === 'week' || view === 'list';
  function step(direction: -1 | 1) {
    const next = addDaysToKey(anchor, direction * (stepsWeek ? 7 : 1));
    setAnchor(next);
    const monday = mondayOfKey(next);
    setEarliestWeek((earliest) => (monday < earliest ? monday : earliest));
  }

  const isPast = (dateKey: string, minutes: number) =>
    new Date(instantAt(dateKey, minutes, timeZone)).getTime() <= Date.now();

  function quickTarget(column: GridColumn, from: number, to?: number, rect?: DOMRect) {
    return {
      dateKey: column.dateKey,
      memberId: column.memberId,
      memberName: teamAvailable ? nameOf(column.memberId) : undefined,
      from,
      to,
      /* На телефоне меню у пальца закрывало бы сам палец — там лист снизу. */
      rect: narrow ? undefined : rect,
      past: isPast(column.dateKey, from),
    } satisfies QuickTarget;
  }

  /*
   * Открыть время сразу — одно окно или весь отрезок — и дать вернуть как было.
   *
   * Спецификация §93: открыть время за пять секунд. Шторка с формой ради одного
   * окна — это двадцать; здесь одно нажатие, а ошибка исправляется «Отменить»,
   * которое снимает ровно созданные окна, а не всё, что было в этом отрезке.
   */
  async function openTime(target: QuickTarget) {
    const memberId = forApi(target.memberId);
    try {
      if (target.to === undefined) {
        const created = await mutations.publish.mutateAsync({
          startsAt: instantAt(target.dateKey, target.from, timeZone),
          memberId,
        });
        toast({
          message: fmt(t.schedule.windowOpened, { time: clock(target.from) }),
          actionLabel: t.common.undo,
          onAction: () => mutations.remove.mutate(created.id),
        });
        return;
      }
      const times = expandSlotTimes(
        [target.dateKey as Parameters<typeof expandSlotTimes>[0][number]],
        target.from,
        target.to,
        SLOT_MINUTES,
        timeZone,
      ).filter((iso) => new Date(iso).getTime() > Date.now());
      if (times.length === 0) return;
      const result = await mutations.publishMany.mutateAsync({ startsAt: times, memberId });
      toast({
        message: fmt(t.schedule.rangeOpened, { from: clock(target.from), to: clock(target.to) }),
        actionLabel: t.common.undo,
        onAction: () =>
          void Promise.all(result.created.map((slot) => deleteSlot(slug, slot.id))).then(
            () => cache.invalidateQueries({ queryKey: ['slots', slug] }),
            (error: unknown) => toast({ message: describeApiError(error, t), tone: 'danger' }),
          ),
      });
    } catch {
      /* Отказ уже назван тостом мутации — второй раз говорить нечего. */
    }
  }

  const interactions: GridInteractions | undefined = narrow
    ? undefined
    : {
        canMove: (entry) =>
          MOVABLE.has(entry.booking.status) &&
          new Date(entry.booking.startsAt).getTime() > Date.now() &&
          (entry.memberId === selfId || canActForOthers || !teamAvailable),
        canDropInto: (entry, column) =>
          !column.memberId || column.memberId === entry.memberId || canActForOthers,
        onRange: (column, range, rect) => setQuick(quickTarget(column, range.from, range.to, rect)),
        onMove: (entry, column, at) => {
          if (isPast(column.dateKey, at)) {
            toast({ message: t.schedule.pastTime, tone: 'danger' });
            return;
          }
          move(entry.booking, {
            startsAt: instantAt(column.dateKey, at, timeZone),
            memberId: column.memberId ?? entry.memberId,
          });
        },
      };

  /* Пустое место календаря не значит «можно записаться» (спецификация §11), и
     пустой день обязан сказать это словами, а не только серой сеткой. */
  const nothingOpen =
    slots !== undefined &&
    view !== 'list' &&
    placed.length === 0 &&
    columns.every((column) => column.slots.length === 0);

  const failed = slotsQuery.isError || bookingsQuery.isError || (teamAvailable && roster.isError);
  const loading =
    slotsQuery.isLoading || bookingsQuery.isPending || (teamAvailable && roster.isPending);

  return (
    <>
      <PageHeader title={t.nav.calendar} />

      {/* Полоса недели — только на телефоне: она же заменяет стрелки. */}
      <div className="only-phone">
        <DayStrip days={weekDays} selected={anchor} onSelect={setAnchor} />
      </div>

      <CalendarToolbar
        view={view}
        views={views}
        onView={setView}
        rangeLabel={
          stepsWeek
            ? formatWeekRange(weekDays, locale, timeZone)
            : formatDayLabel(anchorDay, locale, timeZone)
        }
        stepsWeek={stepsWeek}
        onToday={() => setAnchor(todayKey(timeZone))}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onAvailability={() => setAvailability({ ownerId: personId ?? selfId })}
        onNewBooking={() =>
          openWorkspaceAction({
            kind: 'booking',
            memberId: view === 'team' ? undefined : (personId ?? undefined),
          })
        }
      />

      {teamAvailable && working.length > 1 ? (
        view === 'team' ? (
          <TeamFilter
            mode="many"
            members={working}
            visible={visible}
            onToggle={(memberId) => {
              const next = toggleVisible(visible, memberId, workingIds);
              remember({ visible: next ? [...next] : undefined });
            }}
            onShowAll={() => remember({ visible: undefined })}
          />
        ) : (
          <TeamFilter
            mode="one"
            members={working}
            personId={personId ?? ''}
            onPick={(memberId) => remember({ personId: memberId })}
          />
        )
      ) : null}

      {nothingOpen && !loading && !failed ? (
        <div className="cal-empty">
          <p>{stepsWeek ? t.schedule.emptyWeek : t.schedule.emptyDay}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setAvailability({ ownerId: personId ?? selfId })}
          >
            {t.workspace.openTime}
          </button>
        </div>
      ) : null}

      {failed ? (
        <LoadError
          onRetry={() => {
            void slotsQuery.refetch();
            void bookingsQuery.refetch();
            if (teamAvailable) void roster.refetch();
          }}
        />
      ) : loading ? (
        <Skeleton className="h-96 w-full" />
      ) : view === 'list' ? (
        <CalendarAgenda days={weekDays} entries={placed} slug={slug} timeZone={timeZone} />
      ) : (
        <CalendarGrid
          variant={view === 'team' ? 'team' : 'days'}
          columns={columns}
          entries={placed}
          timeZone={timeZone}
          interactions={interactions}
          /* Занятое время открывает ту же карточку визита, что и везде: она
             живёт в разделе записей вместе со всей механикой и открывается
             адресом, а закрытие возвращает сюда же. */
          onSelectBooking={(booking) =>
            router.push(`/${slug}/dashboard/bookings?booking=${booking.id}`)
          }
          onSelectSlot={setSelectedSlotId}
          onSelectEmpty={(column, minutes, rect) =>
            setQuick(quickTarget(column, minutes, undefined, rect))
          }
        />
      )}

      <CalendarQuickActions
        target={quick}
        onClose={() => setQuick(null)}
        onNewBooking={(target) => {
          setQuick(null);
          openWorkspaceAction({
            kind: 'booking',
            date: target.dateKey,
            time: clock(target.from),
            memberId: target.memberId ?? undefined,
          });
        }}
        onOpen={(target) => {
          setQuick(null);
          void openTime(target);
        }}
        onPeriod={(target) => {
          setQuick(null);
          setAvailability({
            ownerId: target.memberId,
            draft: { date: target.dateKey, time: clock(target.from) },
          });
        }}
      />

      <AvailabilitySheet
        open={availabilityOpen}
        onOpenChange={(next) => {
          if (!next) closeAvailability();
        }}
        initial={availability?.draft}
        owner={
          canActForOthers && working.length > 1
            ? {
                members: working.map((member) => ({ id: member.id, name: member.name })),
                memberId: availabilityOwner ?? '',
                onChange: (memberId) =>
                  setAvailability((current) => ({ draft: current?.draft, ownerId: memberId })),
              }
            : undefined
        }
        publishing={mutations.publish.isPending}
        onPublish={async (startsAt) => {
          await mutations.publish.mutateAsync({ startsAt, memberId: forApi(availabilityOwner) });
        }}
        onOpenPeriod={() => {
          setPeriod({ kind: 'publish', ownerId: availabilityOwner });
          closeAvailability();
        }}
        onClearPeriod={() => {
          setPeriod({ kind: 'clear', ownerId: availabilityOwner });
          closeAvailability();
        }}
      />

      <SlotDetailSheet
        open={Boolean(selectedSlot)}
        onOpenChange={(next) => !next && setSelectedSlotId(null)}
        slot={selectedSlot}
        booking={selectedBooking}
        onReschedule={async (slotId, startsAt) => {
          await mutations.reschedule.mutateAsync({ slotId, startsAt });
          setSelectedSlotId(null);
        }}
        onToggleVisibility={async (slotId, hidden) => {
          await mutations.visibility.mutateAsync({ slotId, hidden });
        }}
        onDelete={(slotId) =>
          mutations.remove.mutate(slotId, { onSuccess: () => setSelectedSlotId(null) })
        }
        busy={
          mutations.reschedule.isPending ||
          mutations.remove.isPending ||
          mutations.visibility.isPending
        }
      />

      <BulkClearSheet
        open={period?.kind === 'clear'}
        onOpenChange={(next) => !next && setPeriod(null)}
        submitting={mutations.clear.isPending || mutations.visibilityInRange.isPending}
        onClear={(from, to) =>
          mutations.clear.mutateAsync({ from, to, memberId: forApi(period?.ownerId ?? null) })
        }
        onSetVisibility={(from, to, hidden) =>
          mutations.visibilityInRange.mutateAsync({
            from,
            to,
            hidden,
            memberId: forApi(period?.ownerId ?? null),
          })
        }
      />

      {/* Уже открытые окна того же человека едут в шторку: без них предпросмотр
          обещал «будет опубликовано 32», а ответ приходил «пропущено 32». */}
      <BulkPublishSheet
        open={period?.kind === 'publish'}
        onOpenChange={(next) => !next && setPeriod(null)}
        onPublish={(startsAt) =>
          mutations.publishMany.mutateAsync({
            startsAt,
            memberId: forApi(period?.ownerId ?? null),
          })
        }
        submitting={mutations.publishMany.isPending}
        existing={(slots ?? []).filter(
          (slot) => !period?.ownerId || slot.organizationMemberId === period.ownerId,
        )}
      />
    </>
  );
}
