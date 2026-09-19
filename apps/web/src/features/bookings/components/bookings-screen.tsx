'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { CsvButton } from '@/features/dashboard-shell/components/csv-button';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { useWorkspace } from '@/features/dashboard-shell/workspace-context';
import { getMyOrganization } from '@/features/organization-profile/api';
import { selectableMembers, useTeamRoster } from '@/features/team/use-team-roster';
import { teamTones } from '@/lib/avatar';
import { addDaysToKey, todayKey } from '@/lib/civil-date';
import { formatDayShort } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { fromDayWindow } from '@/lib/time-window';
import { useTimeZone } from '@/lib/timezone';

import { listClients } from '../../clients/api';
import { bookableSlots } from '../../scheduling/bookable';
import { listSlots } from '../../scheduling/api';
import { listServices } from '../../services/api';
import { createBooking, listBookings } from '../api';
import { exportBookings } from '../export';
import { isCancelled, matchesFilter, parseBookingFilter, type BookingFilter } from '../filter';
import { searchBookings } from '../search';
import { getBookingStatusFilters } from '../status-meta';
import type { Booking } from '../types';
import { useBookingSheets } from '../use-booking-sheets';
import { BookingRulesSheet } from './booking-rules-sheet';
import { BookingSheets } from './booking-sheets';
import { NewBookingSheet } from './new-booking-sheet';
import { VisitRow } from './visit-row';

/** How many finished bookings show before «показать ещё» — the group is an archive, not the work. */
const PAST_PREVIEW_COUNT = 5;

/**
 * Сколько прошедших записей добавляет одно нажатие «показать ещё».
 *
 * Порциями, а не всё разом. Нажатие раскрывало **весь** архив: у мастера
 * второго года это несколько сотен карточек, отрисованных в один кадр, — на
 * телефоне между клиентами это заметная пауза, после которой нужное всё равно
 * ищут поиском. Двадцать — примерно два экрана: видно, что список продолжился,
 * и понятно, что кнопка нажимается ещё раз.
 */
const PAST_PAGE_SIZE = 20;
/** Сколько будущих записей показывать за раз. */
const UPCOMING_PAGE_SIZE = 20;

/**
 * Сколько прошлого экран грузит, пока его об этом не попросили.
 *
 * Тридцать дней — не круглое число ради круглого: столько нужно, чтобы группа
 * «прошедшие» была не пустой (её превью — пять строк) и чтобы мастер видела
 * недавнюю работу, за которую ещё может отвечать на вопросы клиента. Вся
 * история подгружается по требованию — когда мастер раскрывает архив, ищет
 * или смотрит завершённые и отменённые; см. `historyWanted`.
 */
const RECENT_PAST_DAYS = 30;

/* The filter survives navigation within the visit (Alex kept re-tapping
   «Новые» on every return) but resets with the browser session — a filter is
   a working posture, not a setting. */
function readStoredFilter(slug: string): BookingFilter {
  return parseBookingFilter(window.sessionStorage.getItem(`bookings-filter:${slug}`) ?? undefined);
}

/* Хранилище сессии меняется только этим экраном — подписка не нужна. */
const subscribeNothing = () => () => {};

type GroupKey = 'pending' | 'today' | 'upcoming' | 'past' | 'cancelled';

interface BookingsScreenProps {
  slug: string;
  /** Set when something linked here asking for a posture — see `filter.ts`. */
  initialFilter?: BookingFilter;
}

/**
 * «Записи» — прототип «Кабинет 2026»: одна ячейка, в ней поиск, лента
 * фильтров статуса со счётчиками и группы по смыслу времени.
 *
 * «Ждут подтверждения» стоят первыми и несут «Подтвердить» прямо в строке:
 * это работа, которую нельзя отложить, — клиент не знает, придёт ли он.
 * Дальше «Сегодня», «Дальше», «Прошедшие» порциями и «Отменённые». Прежде
 * экран держал отдельно янтарную карточку, вкладки «ближайшие / прошедшие /
 * все», выпадающий статус и таблицу, которая на телефоне превращалась в
 * другой список: четыре способа спросить одно и то же.
 */
export function BookingsScreen({ slug, initialFilter }: BookingsScreenProps) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();

  /*
   * Сохранённый фильтр — внешний источник, а не начальное состояние.
   *
   * Читался в `useState` при первой отрисовке: на сервере это «Все», в
   * браузере — «Завершённые». Гидратация оставляла серверную разметку чипов,
   * а список рисовался по браузерному значению: после обновления страницы
   * горел чип «Все», а под ним шли только прошедшие. Здесь сервер и первый
   * кадр согласны («не знаем»), а дальше экран берёт сохранённое.
   */
  const storedFilter = useSyncExternalStore(
    subscribeNothing,
    () => readStoredFilter(slug),
    () => null,
  );
  const [chosenFilter, setChosenFilter] = useState<BookingFilter | null>(initialFilter ?? null);
  const filter: BookingFilter = chosenFilter ?? storedFilter ?? 'all';

  /*
   * Запись и «новая запись» приходят адресом.
   *
   * Главная — серверный экран, и своих шторок у неё нет: ссылка на визит
   * ведёт сюда и обязана открыть его карточку, а не просто показать список,
   * в котором его ещё надо найти. Тем же способом открывается форма новой
   * записи: `?new=1`. Читается один раз, при монтаже.
   */
  const searchParams = useSearchParams();
  const [initialQuery] = useState(() => ({
    booking: searchParams.get('booking'),
    create: searchParams.get('new') === '1',
  }));

  /*
   * Откуда пришли — туда и возвращаемся. Карточку визита открывают и с
   * главной, и из календаря, и из поиска; закрытие не имеет права оставлять
   * мастера в списке, которого она не открывала. Возврат делает история
   * браузера: она знает, откуда пришли, включая «открыл ссылку из
   * уведомления», где возвращаться некуда.
   */
  const router = useRouter();
  const [cameByLink] = useState(() => Boolean(initialQuery.booking));

  function returnToOrigin() {
    if (cameByLink && typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    }
  }

  const [sheetOpen, setSheetOpen] = useState(() => initialQuery.create);
  const workspace = useWorkspace();
  const teamAvailable = Boolean(workspace?.capabilities.canViewTeamCalendar);
  /* Состав нужен строкам салона — назвать мастера визита — и форме записи. */
  const roster = useTeamRoster(slug, teamAvailable);
  const [rulesOpen, setRulesOpen] = useState(false);
  /* Сколько прошедших записей показано сейчас. Число, а не «раскрыт/свёрнут»:
     архив открывается порциями, и состояние — это граница, а не флаг. */
  /* Отменённые тоже порциями: они шли списком целиком и добавляли экрану
     пару тысяч пикселей, хотя отменённая запись — то, на что смотрят реже
     всего. */
  const [cancelledShown, setCancelledShown] = useState(PAST_PREVIEW_COUNT);
  const [pastShown, setPastShown] = useState(PAST_PREVIEW_COUNT);
  const [upcomingShown, setUpcomingShown] = useState(UPCOMING_PAGE_SIZE);
  const pastExpanded = pastShown > PAST_PREVIEW_COUNT;
  const [query, setQuery] = useState('');

  /*
   * Нужна ли экрану вся история — или хватит недавнего прошлого.
   *
   * Только по прямой просьбе: мастер раскрыла архив, начала искать или
   * смотрит завершённые и отменённые. Поиск — второй вопрос экрана («а что
   * там было у Анны»), и отвечать на него тридцатью днями значило бы молча
   * не найти визит полугодовой давности.
   */
  const historyWanted =
    pastExpanded ||
    query.trim().length > 0 ||
    filter === 'completed' ||
    filter === 'cancelled' ||
    filter === 'missed';

  /* Без верхней границы: будущие записи — это работа, ради которой экран и
     открывают. Растёт назад, и только назад. */
  const bookingsWindow = historyWanted
    ? {}
    : fromDayWindow(addDaysToKey(todayKey(timeZone), -RECENT_PAST_DAYS), timeZone);

  /* Глубина запроса — в ключе: без неё React Query отдал бы на просьбу
     показать архив прежний, укороченный ответ из кэша. Инвалидация мутаций
     идёт по префиксу `['bookings', slug]` и накрывает оба варианта. */
  const bookingsKey = ['bookings', slug, historyWanted ? 'all' : 'recent'];
  const allBookingsKey = ['bookings', slug];

  const {
    data: bookings,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: bookingsKey,
    queryFn: () => listBookings(slug, bookingsWindow),
    /* Уже показанные записи остаются на экране, пока едет история: раскрытие
       архива не имеет права мигнуть скелетоном по всему списку. */
    placeholderData: (previous) => previous,
  });
  /* Окна нужны шторке новой записи, а она предлагает только будущие. */
  const slotsWindow = fromDayWindow(todayKey(timeZone), timeZone);
  const { data: slots } = useQuery({
    queryKey: ['slots', slug, 'future'],
    queryFn: () => listSlots(slug, slotsWindow),
  });
  const { data: services } = useQuery({
    queryKey: ['services', slug],
    queryFn: () => listServices(slug),
  });
  /* Книга — шторке новой записи; ключ тот же, что у экрана клиентов. */
  const { data: clients } = useQuery({
    queryKey: ['clients', slug],
    queryFn: () => listClients(slug),
  });
  /* Тот же ключ, что у редактора страницы: два экрана не расходятся в том,
     как принимаются записи. */
  const { data: organization } = useQuery({
    queryKey: ['my-organization'],
    queryFn: getMyOrganization,
  });

  function applyFilter(next: BookingFilter) {
    setChosenFilter(next);
    window.sessionStorage.setItem(`bookings-filter:${slug}`, next);
  }

  /* A posture arrived at through a link is still a posture: remember it, or
     coming back from a booking would silently restore the previous one. */
  useEffect(() => {
    if (initialFilter) window.sessionStorage.setItem(`bookings-filter:${slug}`, initialFilter);
  }, [initialFilter, slug]);

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createBooking>[1]) => createBooking(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: allBookingsKey });
      void queryClient.invalidateQueries({ queryKey: ['slots', slug] });
      setSheetOpen(false);
    },
  });

  /* Карточка визита, правка и отмена — общей механикой с календарём. */
  const sheets = useBookingSheets(slug, bookings, {
    initialViewingId: initialQuery.booking,
    onDetailClosed: returnToOrigin,
  });

  const availableSlots = bookableSlots(slots ?? []);
  const searched = searchBookings(bookings ?? [], query);

  const today = todayKey(timeZone);
  /* Граница «сегодня» — сутки заведения, а не минута: день разбирают целиком,
     и минута непостоянна между отрисовками. */
  const dayOf = (iso: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso));
  /* День строки — «пн 14», как в прототипе «Кабинет 2026»: в колонке 58 px
     «пт, 18 сент.» переносилось на три строки. Месяц — только у дня из
     другого месяца. */
  const weekdayFormat = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
  });
  /* «Завтра» словом ушло: в колонке дней оно ломало ряд «пн 14 · вт 15». */
  const dayLabel = (iso: string) =>
    dayOf(iso).slice(0, 7) === today.slice(0, 7)
      ? weekdayFormat.format(new Date(iso)).replace(',', '')
      : formatDayShort(iso, locale, timeZone, false);

  /* Счётчики ленты считают найденное: число у фильтра — ответ на вопрос
     «сколько я увижу, если нажму». */
  const filters = getBookingStatusFilters(t);
  const counts = new Map(
    filters.map((item) => [
      item.key,
      searched.filter((booking) => matchesFilter(booking.status, item.key)).length,
    ]),
  );

  const visible = searched.filter((booking) => matchesFilter(booking.status, filter));
  const byStart = (a: Booking, b: Booking) => a.startsAt.localeCompare(b.startsAt);
  const byStartDesc = (a: Booking, b: Booking) => b.startsAt.localeCompare(a.startsAt);

  const awaiting = (booking: Booking) =>
    booking.status === 'pending' && dayOf(booking.startsAt) >= today;
  const active = visible.filter((booking) => !isCancelled(booking.status) && !awaiting(booking));
  const pastAll = active.filter((booking) => dayOf(booking.startsAt) < today).sort(byStartDesc);

  /* Короткий хвост не прячется за «Показать ещё»: «показано 5 из 8» и
     кнопка ради трёх строк — лишнее нажатие. Порция расширяется, если за
     ней осталось не больше трёх. */
  const fits = (shown: number, total: number) => (total - shown <= 3 ? total : shown);

  const groups: { key: GroupKey; label: string; rows: Booking[]; total: number }[] = [
    {
      key: 'pending' as const,
      label: t.bookings.groupPending,
      all: visible.filter(awaiting).sort(byStart),
    },
    {
      key: 'today' as const,
      label: t.bookings.groupToday,
      all: active.filter((booking) => dayOf(booking.startsAt) === today).sort(byStart),
    },
    {
      key: 'upcoming' as const,
      label: t.bookings.groupUpcoming,
      all: active.filter((booking) => dayOf(booking.startsAt) > today).sort(byStart),
    },
    { key: 'past' as const, label: t.bookings.tabPast, all: pastAll },
    {
      key: 'cancelled' as const,
      label: t.bookings.filterCancelled,
      all: visible.filter((booking) => isCancelled(booking.status)).sort(byStartDesc),
    },
  ]
    .map(({ all, ...group }) => ({
      ...group,
      rows:
        group.key === 'past'
          ? all.slice(0, fits(pastShown, all.length))
          : group.key === 'upcoming'
            ? all.slice(0, fits(upcomingShown, all.length))
            : group.key === 'cancelled'
              ? all.slice(0, fits(cancelledShown, all.length))
              : all,
      total: all.length,
    }))
    .filter((group) => group.rows.length > 0);

  const shownRows = groups.flatMap((group) => group.rows);
  /* Архив продолжается, если показано не всё или история ещё не загружена. */
  const morePast =
    pastAll.length > fits(pastShown, pastAll.length) || (!historyWanted && pastAll.length > 0);

  const teamMode = teamAvailable && (roster.data?.length ?? 0) > 1;
  const memberNameOf = (booking: Booking) =>
    teamMode
      ? roster.data
          ?.find((member) => member.id === booking.organizationMemberId)
          ?.name.split(' ')[0]
      : undefined;
  /* Тон человека — тот же, что на главной: точка перед именем мастера. */
  const tones = teamTones((roster.data ?? []).map((member) => member.id));
  const memberToneOf = (booking: Booking) =>
    teamMode && tones[booking.organizationMemberId]
      ? `var(--tone-${tones[booking.organizationMemberId]})`
      : undefined;

  const row = (booking: Booking, group: GroupKey) => {
    const minutes =
      booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) || 30;
    const isToday = dayOf(booking.startsAt) === today;
    return (
      <VisitRow
        key={booking.id}
        startsAt={booking.startsAt}
        minutes={minutes}
        clientName={booking.guestName || t.home.guest}
        serviceName={booking.items.map((item) => item.serviceNameSnapshot).join(' + ')}
        status={booking.status}
        memberName={memberNameOf(booking)}
        memberTone={memberToneOf(booking)}
        /* Не сегодняшняя строка называет день: «пн 14», под ним час. */
        day={isToday ? undefined : dayLabel(booking.startsAt)}
        onOpen={() => sheets.view(booking.id)}
        action={
          group === 'pending' ? (
            <Button
              size="pill"
              variant="secondary"
              disabled={sheets.updatingId === booking.id}
              onClick={() => sheets.setStatus(booking, 'confirmed')}
            >
              <Icon name="check" className="ico-16" />
              <span>{t.bookings.confirm}</span>
            </Button>
          ) : undefined
        }
      />
    );
  };

  return (
    <>
      <PageHeader
        title={t.nav.bookings}
        meta={t.nav.hintBookings}
        actions={
          <>
            {/* Правила приёма — значком: в шапке прототипа их нет, а убрать
                дорогу к ним нельзя. Название — в подсказке и для читалки. */}
            {organization ? (
              /* Значок с подписью: одна шестерёнка рядом с «CSV» не говорила,
                 что за ней правила приёма записей. */
              <Button
                variant="ghost"
                size="sm"
                aria-label={t.bookings.howToAccept}
                title={t.bookings.howToAccept}
                onClick={() => setRulesOpen(true)}
              >
                <Icon name="sliders" className="ico-18" />
                <span aria-hidden="true">{t.bookings.rulesShort}</span>
              </Button>
            ) : null}

            {/* Выгружается ровно то, что показывает экран: тот же отбор и тот
                же поиск. Кнопка «скачать» под отфильтрованным списком,
                отдающая файл про что-то другое, — обман. */}
            {/* Кнопка стоит всегда и гаснет на пустом списке: исчезая, она
                сдвигала шапку при каждом переключении фильтра. */}
            <CsvButton
              label={t.bookings.exportCsv}
              disabled={shownRows.length === 0}
              onClick={() => exportBookings(shownRows, slug, t, timeZone)}
            />

            <Button
              size="sm"
              className="page-action--create page-action--booking"
              onClick={() => setSheetOpen(true)}
            >
              <Icon name="plus" className="ico-18" />
              <span>{t.schedule.newBooking}</span>
            </Button>
          </>
        }
      />

      <section className="card list-panel list-panel--narrow" aria-label={t.nav.bookings}>
        <label className="panel-search">
          <Icon name="search" className="ico-18" />
          <input
            className="field-control panel-search__input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.bookings.searchPlaceholder}
            aria-label={t.bookings.searchPlaceholder}
          />
        </label>

        <div className="panel-chips" role="group" aria-label={t.bookings.colStatus}>
          {filters.map((item) => (
            <button
              type="button"
              key={item.key}
              className={filter === item.key ? 'panel-chip is-on' : 'panel-chip'}
              aria-pressed={filter === item.key}
              onClick={() => applyFilter(item.key)}
            >
              {item.label}
              {/* Пока записи едут, числа нет: «Все 0» на загрузке читалось
                  пустой книгой, а через секунду прыгало на 237. */}
              {isLoading ? null : (
                <span className="panel-chip__n tnum">{counts.get(item.key) ?? 0}</span>
              )}
            </button>
          ))}
        </div>

        {isError ? (
          <LoadError onRetry={() => void refetch()} />
        ) : isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : groups.length ? (
          groups.map((group) => (
            <section key={group.key} className="list-group" aria-label={group.label}>
              <h2 className="list-group__head">
                {group.label}
                <span className="list-group__n tnum">{group.total}</span>
              </h2>
              <div className="visit-list">
                {group.rows.map((booking) => row(booking, group.key))}
              </div>
              {/* Архив открывается порциями: раскрытие тянет всю историю с
                  сервера, и просить её, пока мастер смотрит ближайшие, незачем. */}
              {/* «Дальше» — тоже порциями: у салона на недели вперёд сотня
                  записей, и без порций список уходил на десять экранов. */}
              {group.key === 'upcoming' && group.total > group.rows.length ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="bookings-more"
                  onClick={() => setUpcomingShown((value) => value + UPCOMING_PAGE_SIZE)}
                >
                  {fmt(t.common.showMore, {
                    count: Math.min(UPCOMING_PAGE_SIZE, group.total - group.rows.length),
                  })}
                </Button>
              ) : null}
              {group.key === 'past' && morePast ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="bookings-more"
                  onClick={() => setPastShown((value) => value + PAST_PAGE_SIZE)}
                >
                  {fmt(t.common.showMore, { count: PAST_PAGE_SIZE })}
                </Button>
              ) : null}
              {group.key === 'cancelled' && group.total > group.rows.length ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="bookings-more"
                  onClick={() => setCancelledShown((value) => value + PAST_PAGE_SIZE)}
                >
                  {fmt(t.common.showMore, {
                    count: Math.min(PAST_PAGE_SIZE, group.total - group.rows.length),
                  })}
                </Button>
              ) : null}
            </section>
          ))
        ) : /* «Записей нет» верно только для пустой книги. Пустой фильтр или
             поиск говорит, что не нашлось именно здесь. */
        query.trim() ? (
          <EmptyState
            title={t.bookings.emptyFilteredTitle}
            hint={fmt(t.bookings.emptySearchHint, { query: query.trim() })}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery('');
                  applyFilter('all');
                }}
              >
                {t.bookings.clearFilters}
              </Button>
            }
          />
        ) : filter !== 'all' ? (
          <EmptyState
            title={t.bookings.emptyFilteredTitle}
            hint={t.bookings.emptyFilterHint}
            action={
              <Button variant="secondary" size="sm" onClick={() => applyFilter('all')}>
                {t.bookings.clearFilters}
              </Button>
            }
          />
        ) : (
          <EmptyState title={t.bookings.emptyTitle} hint={t.bookings.emptyHint} />
        )}

        {shownRows.length > 0 ? (
          <p className="panel-pager tnum">
            {/* «5 записей» под группой из 44 читалось как «их пять». Число
                без итога — только пока архив не загружен и итог неизвестен. */}
            {groups.some((group) => group.rows.length < group.total)
              ? fmt(t.bookings.shownOf, {
                  count: shownRows.length,
                  total: groups.reduce((sum, group) => sum + group.total, 0),
                })
              : morePast
                ? fmt(t.bookings.countLabel, { count: shownRows.length })
                : fmt(t.bookings.shownAll, {
                    count: shownRows.length,
                    bookings: plural(locale, shownRows.length, t.common.bookingForms),
                  })}
          </p>
        ) : null}
      </section>

      {organization ? (
        <BookingRulesSheet
          open={rulesOpen}
          onOpenChange={setRulesOpen}
          slug={slug}
          organization={organization}
        />
      ) : null}

      <BookingSheets {...sheets.props} />

      <NewBookingSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        availableSlots={availableSlots}
        services={services ?? []}
        onSubmit={async (input) => {
          await createMutation.mutateAsync(input);
        }}
        submitting={createMutation.isPending}
        clients={clients ?? []}
        members={selectableMembers(roster.data)}
        memberId={workspace?.memberId}
        slug={slug}
      />
    </>
  );
}
