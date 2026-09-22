'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { useNarrow } from '@/features/dashboard-shell/use-narrow';
import { openWorkspaceAction } from '@/features/dashboard-shell/workspace-actions';
import { useWorkspace } from '@/features/dashboard-shell/workspace-context';
import { useTeamRoster } from '@/features/team/use-team-roster';
import { FALLBACK_TIMEZONE } from '@/lib/civil-date';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDuration } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { memberTone, teamTones } from '@/lib/avatar';
import { fmt, plural } from '@/lib/i18n/messages';
import { fromDayWindow } from '@/lib/time-window';
import { useTimeZone } from '@/lib/timezone';

import { listBookings } from '../../bookings/api';
import { BookingSheets } from '../../bookings/components/booking-sheets';
import { useBookingSheets } from '../../bookings/use-booking-sheets';
import { deleteSlot, listSlots, listTimeBlocks } from '../api';
import {
  bookingEntries,
  hasChair,
  placeEntries,
  resolveView,
  restoreVisible,
  teamColumns,
  toggleVisible,
  weekColumns,
  type CalendarView,
  type GridColumn,
} from '../calendar-columns';
import { SLOT_MINUTES, clock, windowEndOf } from '../calendar-model';
import { useCalendarPreferences } from '../calendar-preferences';
import { calendarSummary } from '../calendar-summary';
import { instantAt } from '../grid-geometry';
import { useBookingMove } from '../use-booking-move';
import { useSlotMutations } from '../use-slot-mutations';
import { useTimeBlockMutations } from '../use-time-blocks';
import {
  addDaysToKey,
  buildWeek,
  expandSlotTimes,
  formatWeekRange,
  mondayOfKey,
  todayKey,
} from '../week';
import { AvailabilitySheet } from './availability-sheet';
import { BlockDetailSheet } from './block-detail-sheet';
import { BulkClearSheet } from './bulk-clear-sheet';
import { BulkPublishSheet } from './bulk-publish-sheet';
import { CalendarAgenda } from './calendar-agenda';
import { CalendarDayAgenda } from './calendar-day-agenda';
import { CalendarGrid, type GridInteractions } from './calendar-grid';
import { CalendarQuickActions, type QuickTarget } from './calendar-quick-actions';
import { CalendarSummary } from './calendar-summary';
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
  /* Тон человека — одна карта команды на весь кабинет: колонка и визиты Юли
     того же цвета, что её точка на «Сегодня» и в «Записях». */
  const toneOf = useMemo(() => {
    const tones = teamTones(members.map((member) => member.id));
    return (memberId: string) => tones[memberId] ?? memberTone(memberId);
  }, [members]);
  const working = useMemo(() => members.filter((member) => member.status === 'active'), [members]);
  const workingIds = useMemo(() => working.map((member) => member.id), [working]);

  const view = resolveView(searchParams.get('view'), preferences.view, { teamAvailable, narrow });
  /* Виды прототипа «Кабинет 2026»: «Команда» тому, кто её видит, «День»,
     «Неделя» — на любой ширине. */
  const views: CalendarView[] = teamAvailable ? ['team', 'day', 'week'] : ['day', 'week'];

  function setView(next: CalendarView) {
    /* Выбор на телефоне не запоминается: там сетка — всегда день, и привычка
       телефона перебила бы привычку большого экрана. */
    if (!narrow) remember({ view: next });
    router.replace(`/${slug}/dashboard/calendar?view=${next}`, { scroll: false });
  }

  /* Чьё время в дне и неделе. Без команды вопроса нет: сервер и так отдаёт
     только своё или только одно. Ушедший из команды выбор сбрасывается к себе. */
  /* Страница человека зовёт сюда `?member=`: пока адрес его несёт, названный
     человек сильнее привычки. */
  const requestedPerson = searchParams.get('member');
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
  /* Блоки — тем же окном: без них сетка показала бы свободным время, в
     котором мастера нет, и потому их отказ — отказ всего экрана. */
  const blocksQuery = useQuery({
    queryKey: ['time-blocks', slug, earliestWeek],
    queryFn: () => listTimeBlocks(slug, slotsWindow),
    placeholderData: (previous) => previous,
  });
  const slots = slotsQuery.data;
  const bookings = bookingsQuery.data;
  const blocks = blocksQuery.data;

  /* Чей день открывается первым, пока человек не выбрал сам: свой — если у
     себя есть открытое время; иначе первый работающий, у кого оно есть.
     Администратор, который клиентов не принимает, видел собственную пустую
     колонку «время не открыто» вместо дня салона. */
  const hasTime = (memberId: string | null) =>
    Boolean(memberId && slots?.some((slot) => slot.organizationMemberId === memberId));
  const defaultPerson =
    !slots || hasTime(selfId)
      ? selfId
      : (working.find((member) => member.id !== selfId && hasTime(member.id))?.id ?? selfId);
  const personId = teamAvailable
    ? requestedPerson && workingIds.includes(requestedPerson)
      ? requestedPerson
      : preferences.personId && workingIds.includes(preferences.personId)
        ? preferences.personId
        : defaultPerson
    : null;
  const mutations = useSlotMutations(slug);
  const blockMutations = useTimeBlockMutations(slug);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const selectedBlock = blocks?.find((block) => block.id === selectedBlockId) ?? null;
  const { move } = useBookingMove(slug);
  /* Карточка визита открывается здесь же, поверх сетки (спецификация §17), —
     та же, что в списке записей, со всеми её действиями. */
  const sheets = useBookingSheets(slug, bookings);

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
    () => bookingEntries(bookings ?? [], timeZone, t.home.guest, toneOf),
    [bookings, timeZone, t.home.guest, toneOf],
  );
  /* Точки под числами ленты дней — тона услуг того, чьё время смотрят. */
  const tonesByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const entry of entries) {
      if (personId && entry.memberId !== personId) continue;
      map.set(entry.dateKey, [...(map.get(entry.dateKey) ?? []), entry.tone]);
    }
    return map;
  }, [entries, personId]);
  const placed = useMemo(
    () => placeEntries(entries, view, { dateKey: anchor, personId }),
    [entries, view, anchor, personId],
  );

  /* За кого открывают время — те, кто принимает клиентов. Администратор
     ведёт стойку, а не кресло, и в «Рабочем времени» предлагался мастером;
     у кого окна уже есть, тот остаётся — снять или продлить их надо уметь. */
  const schedulable = useMemo(
    () =>
      working.filter(
        (member) =>
          member.role !== 'admin' ||
          (slots ?? []).some((slot) => slot.organizationMemberId === member.id),
      ),
    [working, slots],
  );

  /* Кого показывает фильтр — ровно те, у кого в сетке есть колонка.
     Администратор без записей и без открытого времени ведёт стойку, а не
     кресло, и `teamColumns` его отбрасывает; фильтр, предлагавший его,
     обещал колонку, которой нет. Списки «за кого открыть время» ниже этим
     правилом не сужаются: время открывают и тому, у кого сегодня пусто. */
  const onGrid = useMemo(
    () =>
      working.filter((member) =>
        hasChair(
          member,
          anchorDay,
          entries.some(
            (entry) => entry.dateKey === anchorDay.dateKey && entry.memberId === member.id,
          ),
        ),
      ),
    [working, anchorDay, entries],
  );

  const baseColumns = useMemo<GridColumn[]>(() => {
    if (view === 'team') {
      return teamColumns(
        anchorDay,
        members,
        visible,
        entries,
        /* «3 записи · 5 ч» — шапка колонки прототипа «Кабинет 2026». */
        (count, minutes) => {
          const bookings = `${count} ${plural(locale, count, t.common.bookingForms)}`;
          if (!minutes) return bookings;
          return `${bookings} · ${formatDuration(minutes, {
            hoursShort: t.common.hoursShort,
            minutesShort: t.common.minutesShort,
          })}`;
        },
        toneOf,
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
    t.common.hoursShort,
    t.common.minutesShort,
    weekDays,
    personId,
    toneOf,
  ]);
  /* Блоки колонки — того человека, чья она; у колонки без человека (соло)
     сервер и так отдал только свои. По дню их режет модель сетки. */
  const columns = useMemo<GridColumn[]>(
    () =>
      baseColumns.map((column) => ({
        ...column,
        blocks: (blocks ?? []).filter(
          (block) => !column.memberId || block.organizationMemberId === column.memberId,
        ),
      })),
    [baseColumns, blocks],
  );

  const selectedSlot = slots?.find((slot) => slot.id === selectedSlotId) ?? null;
  const selectedBooking =
    bookings?.find(
      (booking) =>
        booking.publishedSlotId === selectedSlotId &&
        booking.status !== 'cancelled_by_client' &&
        booking.status !== 'cancelled_by_master',
    ) ?? null;

  /*
   * На телефоне «День» — повестка выбранного дня: строки под палец, шаг по
   * дням вместе с лентой дат. «Неделя» там — неделя списком.
   *
   * «Команда» на телефоне — та же сетка, что на большом экране: мастера
   * рядом, колонки прокручиваются вбок. Повесткой она ничем не отличалась от
   * «Дня» — выбранная вкладка «Команда» показывала общий список, и вопрос
   * «кто когда свободен» на телефоне было не задать.
   */
  const listByDay = narrow && view === 'day';
  const stepsWeek = view === 'week';
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
    placed.length === 0 &&
    columns.every((column) => column.slots.length === 0);

  const failed =
    slotsQuery.isError ||
    bookingsQuery.isError ||
    blocksQuery.isError ||
    (teamAvailable && roster.isError);
  const loading =
    slotsQuery.isLoading ||
    bookingsQuery.isPending ||
    blocksQuery.isPending ||
    (teamAvailable && roster.isPending);

  /* Сводка — у дня, командного дня и повестки дня на телефоне: у недели свой
     вопрос. Считает то, что нарисовано, — у повестки это одна колонка дня. */
  const summaryColumns = useMemo(
    () => (listByDay ? columns.filter((column) => column.dateKey === anchor) : columns),
    [listByDay, columns, anchor],
  );
  const summary = useMemo(
    () => calendarSummary(placed, summaryColumns, timeZone),
    [placed, summaryColumns, timeZone],
  );
  const showSummary = (view === 'day' || view === 'team' || listByDay) && !loading && !failed;
  const showingToday = anchor === todayKey(timeZone);
  /* Чьё время на экране: люди колонок; без людей в колонках — все. */
  const screenMembers = new Set(
    summaryColumns.map((column) => column.memberId).filter((id): id is string => Boolean(id)),
  );
  const onScreen = (memberId: string) => screenMembers.size === 0 || screenMembers.has(memberId);

  const zone = timeZone ? { timeZone } : {};
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', ...zone });
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long', ...zone });

  return (
    <>
      {/* Действия экрана — в шапке, как у прототипа «Кабинет 2026»: рабочее
          время вторичной кнопкой, запись — единственной розовой. На телефоне
          «Запись» уступает кружку «Создать» в панели вкладок. */}
      <PageHeader
        title={t.nav.calendar}
        meta={view === 'team' ? t.schedule.hintTeamDay : t.nav.hintCalendar}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              /* Сразу период, как в прототипе: неделю открывают периодом, а
                 поштучно дописывают потом. Кнопка называется как шторка,
                 которую открывает: «Открыть время». */
              onClick={() => setPeriod({ kind: 'publish', ownerId: personId ?? selfId })}
            >
              <Icon name="clock" className="ico-18" />
              <span>{t.schedule.openTimeTitle}</span>
            </Button>
            <Button
              size="sm"
              className="page-action--create page-action--booking"
              onClick={() =>
                openWorkspaceAction({
                  kind: 'booking',
                  memberId: view === 'team' ? undefined : (personId ?? undefined),
                })
              }
            >
              <Icon name="plus" className="ico-18" />
              <span>{t.schedule.newBooking}</span>
            </Button>
          </>
        }
      />

      <CalendarToolbar
        view={view}
        views={views}
        onView={setView}
        /* «12 сентября» антиквой и «суббота · сегодня» рядом — строка
           `.cal-toolbar` прототипа «Кабинет 2026». */
        rangeLabel={
          stepsWeek
            ? formatWeekRange(weekDays, locale, timeZone)
            : anchorDay
              ? dayMonth.format(anchorDay.date)
              : ''
        }
        note={
          stepsWeek || !anchorDay
            ? undefined
            : [
                weekday.format(anchorDay.date),
                anchor === todayKey(timeZone) ? t.workspace.todayMark : '',
              ]
                .filter(Boolean)
                .join(' · ')
        }
        filter={
          /* На телефоне у «Команды» отбора людей нет: имена стоят шапками
             колонок, а лента чипов стоила ещё одного ряда над сеткой. */
          teamAvailable && onGrid.length > 1 && !(narrow && view === 'team') ? (
            view === 'team' ? (
              <TeamFilter
                mode="many"
                members={onGrid}
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
                members={onGrid}
                personId={personId ?? ''}
                onPick={(memberId) => {
                  remember({ personId: memberId });
                  /* Иначе `?member=` из адреса перебивал бы только что сделанный выбор. */
                  if (requestedPerson) {
                    router.replace(`/${slug}/dashboard/calendar?view=${view}`, { scroll: false });
                  }
                }}
              />
            )
          ) : undefined
        }
        stepsWeek={stepsWeek}
        onToday={() => setAnchor(todayKey(timeZone))}
        todayInView={weekDays.some((day) => day.dateKey === todayKey(timeZone))}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
      />

      {/* Лента дней — только на телефоне (прототип «Кабинет 2026»,
          `.daystrip`): там она заменяет стрелки и над днём, и над повесткой.
          На большом экране день листают стрелки и «Сегодня» в строке. */}
      {/* У «Недели» лента не нужна: дни недели уже стоят графиком нагрузки
         прямо под ней, и неделя была показана дважды подряд. */}
      {narrow && view !== 'week' ? (
        <DayStrip
          days={weekDays}
          selected={anchor}
          tones={tonesByDay}
          onSelect={(dateKey) => setAnchor(dateKey)}
        />
      ) : null}

      {nothingOpen && !loading && !failed ? (
        <EmptyState
          className="cal-empty"
          title={stepsWeek ? t.schedule.emptyWeek : t.schedule.emptyDay}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAvailability({ ownerId: personId ?? selfId })}
            >
              {t.workspace.openTime}
            </Button>
          }
        />
      ) : null}

      {showSummary && !narrow ? <CalendarSummary summary={summary} today={showingToday} /> : null}

      {failed ? (
        <LoadError
          onRetry={() => {
            void slotsQuery.refetch();
            void bookingsQuery.refetch();
            void blocksQuery.refetch();
            if (teamAvailable) void roster.refetch();
          }}
        />
      ) : loading ? (
        <Skeleton className="h-96 w-full" />
      ) : listByDay ? (
        <CalendarDayAgenda
          dateKey={anchor}
          entries={placed.filter((entry) => entry.dateKey === anchor)}
          /* Блоки и окна — тех, чьи колонки на экране. В салоне строка
             называет мастера: повестка дня может нести нескольких. */
          blocks={(blocks ?? []).filter((block) => onScreen(block.organizationMemberId))}
          slots={anchorDay.slots.filter((slot) => onScreen(slot.organizationMemberId))}
          showMember={teamAvailable}
          nameOf={(memberId) => nameOf(memberId)}
          timeZone={timeZone}
          onOpen={(id) => sheets.view(id)}
          onBlock={setSelectedBlockId}
          onSlot={setSelectedSlotId}
        />
      ) : narrow && view === 'week' ? (
        <CalendarAgenda
          days={weekDays}
          columns={columns}
          entries={placed}
          timeZone={timeZone}
          onOpen={(id) => sheets.view(id)}
          onSlot={setSelectedSlotId}
          onDay={(dateKey) => {
            setAnchor(dateKey);
            setView('day');
          }}
        />
      ) : (
        <CalendarGrid
          variant={view === 'team' ? 'team' : 'days'}
          density={view === 'team' ? 'compact' : 'spacious'}
          selectedBookingId={sheets.props.viewing?.id ?? null}
          columns={columns}
          entries={placed}
          timeZone={timeZone}
          interactions={interactions}
          /* Нажатие по визиту — его карточка, не уходя с сетки: раньше
             календарь уводил в список записей, и мастер оказывалась на экране,
             которого не открывала. */
          onSelectBooking={(booking) => sheets.view(booking.id)}
          onSelectSlot={setSelectedSlotId}
          onSelectEmpty={(column, minutes, rect) =>
            setQuick(quickTarget(column, minutes, undefined, rect))
          }
          onSelectBlock={setSelectedBlockId}
        />
      )}

      {/* На телефоне сводка — под днём: сначала сам день, потом итог. */}
      {showSummary && narrow ? <CalendarSummary summary={summary} today={showingToday} /> : null}

      {selectedBlock ? (
        <BlockDetailSheet
          block={selectedBlock}
          memberName={teamAvailable ? nameOf(selectedBlock.organizationMemberId) : undefined}
          canRemove={
            !teamAvailable || selectedBlock.organizationMemberId === selfId || canActForOthers
          }
          removing={blockMutations.remove.isPending}
          onRemove={(block) =>
            blockMutations.remove.mutate(block, { onSuccess: () => setSelectedBlockId(null) })
          }
          onClose={() => setSelectedBlockId(null)}
        />
      ) : null}

      <BookingSheets {...sheets.props} />

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
        onBlock={(target) => {
          setQuick(null);
          /* Нажали в точку — час от неё; конец не переходит полночь, иначе
             «до 00:00» вышло бы раньше начала. */
          const end = Math.min(target.to ?? target.from + 60, 24 * 60 - 1);
          openWorkspaceAction({
            kind: 'block',
            date: target.dateKey,
            from: clock(target.from),
            to: clock(end),
            memberId: target.memberId ?? undefined,
          });
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
          canActForOthers && schedulable.length > 1
            ? {
                members: schedulable.map((member) => ({ id: member.id, name: member.name })),
                memberId: availabilityOwner ?? '',
                onChange: (memberId) =>
                  setAvailability((current) => ({ draft: current?.draft, ownerId: memberId })),
              }
            : undefined
        }
        publishing={mutations.publishMany.isPending}
        /* Одним окном: «два часа» — это одна строка календаря, а моменты
           внутри неё нужны лишь затем, чтобы клиент мог начать не только в
           её начале (см. `windowId`). */
        onPublish={async (startsAt) => {
          await mutations.publishMany.mutateAsync({
            startsAt,
            memberId: forApi(availabilityOwner),
            asOneWindow: true,
          });
        }}
        onOpenPeriod={() => {
          setPeriod({ kind: 'publish', ownerId: availabilityOwner });
          closeAvailability();
        }}
      />

      <SlotDetailSheet
        open={Boolean(selectedSlot)}
        onOpenChange={(next) => !next && setSelectedSlotId(null)}
        slot={selectedSlot}
        /* Отрезок окна, а не момента: карточка называет то же, что нарисовано
           в календаре. */
        windowEndsAt={selectedSlotId && slots ? windowEndOf(slots, selectedSlotId) : null}
        booking={selectedBooking}
        memberName={
          teamAvailable && selectedSlot ? nameOf(selectedSlot.organizationMemberId) : undefined
        }
        onBook={(target) => {
          setSelectedSlotId(null);
          openWorkspaceAction({ kind: 'booking', ...target });
        }}
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
        slug={slug}
        memberId={period?.ownerId ?? selfId}
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
        owner={
          canActForOthers && schedulable.length > 1
            ? {
                members: schedulable.map((member) => ({ id: member.id, name: member.name })),
                memberId: period?.ownerId ?? personId ?? selfId ?? '',
                onChange: (memberId) =>
                  setPeriod((current) => (current ? { ...current, ownerId: memberId } : current)),
              }
            : undefined
        }
        onClearPeriod={() =>
          setPeriod((current) => ({ kind: 'clear', ownerId: current?.ownerId ?? null }))
        }
        onOpenOne={() => {
          setAvailability({ ownerId: period?.ownerId ?? personId ?? selfId });
          setPeriod(null);
        }}
      />
    </>
  );
}
