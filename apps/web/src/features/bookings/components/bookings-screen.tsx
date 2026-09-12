'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { SEARCH_THRESHOLD } from '@/lib/list-search';
import { fromDayWindow } from '@/lib/time-window';
import { addDaysToKey, todayKey } from '@/lib/civil-date';

import { useWorkspace } from '@/features/dashboard-shell/workspace-context';
import { selectableMembers, useTeamRoster } from '@/features/team/use-team-roster';

import { listSlots } from '../../scheduling/api';
import { bookableSlots } from '../../scheduling/bookable';
import { listClients } from '../../clients/api';
import { listServices } from '../../services/api';
import { createBooking, listBookings } from '../api';
import { exportBookings } from '../export';
import { searchBookings } from '../search';
import { getBookingStatusFilters } from '../status-meta';
import { BookingRulesSheet } from './booking-rules-sheet';
import { getMyOrganization } from '@/features/organization-profile/api';
import type { Booking } from '../types';
import { matchesFilter, parseBookingFilter, type BookingFilter } from '../filter';
import { AttentionCard } from './attention-card';
import { useBookingSheets } from '../use-booking-sheets';
import { BookingSheets } from './booking-sheets';
import { BookingsList } from './bookings-list';
import { BookingsTable } from './bookings-table';
import { NewBookingSheet } from './new-booking-sheet';
import { useRouter, useSearchParams } from 'next/navigation';

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

/**
 * Сколько прошлого экран грузит, пока его об этом не попросили.
 *
 * Тридцать дней — не круглое число ради круглого: столько нужно, чтобы группа
 * «прошедшие» была не пустой (её превью — пять строк) и чтобы мастер видела
 * недавнюю работу, за которую ещё может отвечать на вопросы клиента. Вся
 * история подгружается по требованию — когда мастер раскрывает архив или
 * начинает искать; см. `historyWanted`.
 */
const RECENT_PAST_DAYS = 30;

/* The filter survives navigation within the visit (Alex kept re-tapping
   «Новые» on every return) but resets with the browser session — a filter is
   a working posture, not a setting. */
function readStoredFilter(slug: string): BookingFilter {
  if (typeof window === 'undefined') return 'all';
  return parseBookingFilter(window.sessionStorage.getItem(`bookings-filter:${slug}`) ?? undefined);
}

/** Позиция списка из макета: ближайшие, прошедшие, все. */
type Posture = 'upcoming' | 'past' | 'all';
const POSTURES: Posture[] = ['upcoming', 'past', 'all'];

interface BookingsScreenProps {
  slug: string;
  /** Set when something linked here asking for a posture — see `filter.ts`. */
  initialFilter?: BookingFilter;
}

export function BookingsScreen({ slug, initialFilter }: BookingsScreenProps) {
  const t = useT();
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<BookingFilter>(
    () => initialFilter ?? readStoredFilter(slug),
  );
  const [posture, setPosture] = useState<Posture>('upcoming');
  /*
   * Открытая карточка записи.
   *
   * Отдельно от правки: нажатие на строку сначала отвечает «что это за
   * запись», и только «Изменить» ведёт в поля. Мастер, заглянувшая посмотреть,
   * во сколько там Анна, попадала прямо в форму — и закрывала её, не прочитав
   * ничего.
   */
  /*
   * Запись и «новая запись» приходят адресом.
   *
   * Главная — серверный экран, и своих шторок у неё нет: ссылка на визит
   * ведёт сюда и обязана открыть его карточку, а не просто показать список,
   * в котором его ещё надо найти. Тем же способом открывается форма новой
   * записи: `?new=1`.
   *
   * Читается один раз, при монтаже: дальше состоянием владеет экран, и
   * возвращать шторку каждый раз, когда адрес не изменился, незачем.
   */
  const searchParams = useSearchParams();
  const [initialQuery] = useState(() => ({
    booking: searchParams.get('booking'),
    create: searchParams.get('new') === '1',
  }));

  /*
   * Откуда пришли — туда и возвращаемся.
   *
   * Карточку визита открывает не только этот раздел: с главной по нажатию на
   * строку дня, из календаря, из поиска. Ссылка ведёт сюда, потому что карточка
   * и вся её механика живут здесь, — но закрытие оставляло мастера в списке
   * записей, которого она не открывала. Для человека это выглядит как «нажал
   * на визит и куда-то провалился».
   *
   * Возврат делает история браузера, а не запомненный адрес: она знает, откуда
   * пришли, включая случай «открыл ссылку из уведомления», где возвращаться
   * некуда и мы просто закрываем карточку.
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
  /* Состав нужен форме записи, и только когда её открыли. */
  const roster = useTeamRoster(
    slug,
    sheetOpen && Boolean(workspace?.capabilities.canViewTeamCalendar),
  );
  const [rulesOpen, setRulesOpen] = useState(false);
  /* Сколько прошедших записей показано сейчас. Число, а не «раскрыт/свёрнут»:
     архив открывается порциями, и состояние — это граница, а не флаг. */
  const [pastShown, setPastShown] = useState(PAST_PREVIEW_COUNT);
  const pastExpanded = pastShown > PAST_PREVIEW_COUNT;
  const [query, setQuery] = useState('');

  /*
   * Нужна ли экрану вся история — или хватит недавнего прошлого.
   *
   * Два случая, и оба — прямая просьба мастера, а не догадка о ней: она
   * раскрыла архив («показать ещё») или начала искать. Поиск здесь именно
   * второй вопрос экрана — «а что там было у Анны», — и отвечать на него
   * тридцатью днями значило бы молча не найти визит полугодовой давности. Это
   * худший из возможных ответов: не «ничего не найдено, потому что не
   * загружено», а просто «ничего не найдено».
   */
  const historyWanted = pastExpanded || posture !== 'upcoming' || query.trim().length > 0;

  /* Отрезок, который экран просит у сервера. Без верхней границы: будущие
     записи — это работа, ради которой экран и открывают. Растёт назад, и
     только назад, поэтому отсекается прошлое. */
  const bookingsWindow = historyWanted
    ? {}
    : fromDayWindow(addDaysToKey(todayKey(timeZone), -RECENT_PAST_DAYS), timeZone);

  /* Глубина запроса — в ключе: без неё React Query отдал бы на просьбу
     показать архив прежний, укороченный ответ из кэша. Инвалидация мутаций
     идёт по префиксу `['bookings', slug]` и накрывает оба варианта. */
  const bookingsKey = ['bookings', slug, historyWanted ? 'all' : 'recent'];

  /* Что гасить после ответа на запись — префикс, а не ключ этого экрана.
     Записи разложены по нескольким кэшам: две глубины этого списка, счётчик
     непринятых в оболочке, окно недели в календаре. Инвалидация ровно своего
     ключа обновила бы список под рукой и оставила бейдж висеть над уже
     отвеченной записью. */
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
  /* Окна нужны шторке новой записи, а она предлагает только будущие
     (`bookableSlots`) — прошлогодние приезжали, чтобы быть отфильтрованными. */
  const slotsWindow = fromDayWindow(todayKey(timeZone), timeZone);
  const { data: slots } = useQuery({
    queryKey: ['slots', slug, 'future'],
    queryFn: () => listSlots(slug, slotsWindow),
  });
  const { data: services } = useQuery({
    queryKey: ['services', slug],
    queryFn: () => listServices(slug),
  });
  /* Книга — шторке новой записи, чтобы своего клиента не набирали заново.
     Ключ тот же, что у экрана клиентов: два ключа на одну книгу означали бы
     два запроса и две расходящиеся копии её в кэше. */
  const { data: clients } = useQuery({
    queryKey: ['clients', slug],
    queryFn: () => listClients(slug),
  });

  function applyFilter(next: BookingFilter) {
    setFilter(next);
    window.sessionStorage.setItem(`bookings-filter:${slug}`, next);
  }

  /* A posture arrived at through a link is still a posture: remember it, or
     coming back from a booking would silently restore the previous one. */
  useEffect(() => {
    if (initialFilter) window.sessionStorage.setItem(`bookings-filter:${slug}`, initialFilter);
  }, [initialFilter, slug]);

  /* Книга спрашивается тем же окном, что и записи: она нужна экрану только
     чтобы подписать видимые строки именем и значком. Глубина — в ключе, как у
     самих записей: иначе раскрытый архив получил бы из кэша прежний, короткий
     список клиентов. */

  /* История клиента — по требованию и тем же ключом, что на экране клиентов:
     карточка, открытая отсюда и оттуда, обязана показывать одно и то же. */
  /* Same key the page editor uses, so the two screens never disagree about
     what the setting currently is. */
  const { data: organization } = useQuery({
    queryKey: ['my-organization'],
    queryFn: getMyOrganization,
  });

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createBooking>[1]) => createBooking(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: allBookingsKey });
      void queryClient.invalidateQueries({ queryKey: ['slots', slug] });
      setSheetOpen(false);
    },
  });

  /* Карточка визита, правка и отмена — общей механикой с календарём: визит
     обязан выглядеть и вести себя одинаково, откуда бы его ни открыли.
     Возврат по истории — только у пришедших ссылкой. */
  const sheets = useBookingSheets(slug, bookings, {
    initialViewingId: initialQuery.booking,
    onDetailClosed: returnToOrigin,
  });

  /* Только будущие: см. `bookable.ts` — свободного статуса мало, окно прошлой
     недели остаётся `available` навсегда. */
  const availableSlots = bookableSlots(slots ?? []);

  /* Два разных вопроса — два контрола: фильтр отвечает «что мне сейчас
     делать», поиск — «а что там было у Анны» (см. `search.ts`). */
  const searched = useMemo(() => searchBookings(bookings ?? [], query), [bookings, query]);

  const showSearch = (bookings?.length ?? 0) >= SEARCH_THRESHOLD;

  /* Ключи суток заведения — таблица подписывает ими «Сегодня» и «Завтра». */
  const today = todayKey(timeZone);
  const tomorrow = addDaysToKey(today, 1);

  /* Позиция списка из макета: ближайшие, прошедшие, все. Она отвечает на
     «что мне делать», а фильтры по статусу и услуге — на «покажи только
     это»; смешивать их в один ряд вкладок значило бы предложить выбрать
     между «Новые» и «Прошедшие», хотя запись бывает и той и другой. */
  /*
   * Граница «ближайших» — сутки, а не минута.
   *
   * В макете сегодняшняя запись в 10:30 стоит под «Ближайшими» весь день, и
   * это правильно: мастер разбирает день целиком, а не то, что осталось после
   * текущей минуты. Минута к тому же непостоянна между отрисовками — список
   * молча переезжал бы под рукой.
   */
  const dayOf = (iso: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso));

  const byPosture = searched.filter((booking: Booking) => {
    if (posture === 'upcoming') return dayOf(booking.startsAt) >= today;
    if (posture === 'past') return dayOf(booking.startsAt) < today;
    return true;
  });

  const shown = byPosture
    .filter((booking: Booking) => matchesFilter(booking.status, filter))
    .sort((a: Booking, b: Booking) =>
      posture === 'past'
        ? b.startsAt.localeCompare(a.startsAt)
        : a.startsAt.localeCompare(b.startsAt),
    );

  /* Непринятые — всегда все, независимо от позиции и фильтра: карточка
     наверху существует ровно затем, чтобы их нельзя было не заметить. */
  const pending = (bookings ?? []).filter(
    (booking: Booking) => booking.status === 'pending' && dayOf(booking.startsAt) >= today,
  );

  return (
    <>
      <PageHeader
        title={t.nav.bookings}
        actions={
          <>
            {showSearch ? (
              <label className="search home-search">
                <Icon name="search" className="ico-18" />
                <input
                  className="bookings-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.bookings.searchPlaceholder}
                  aria-label={t.bookings.searchPlaceholder}
                />
              </label>
            ) : null}

            {/* Выгружается ровно то, что показывает экран: тот же отрезок и
                тот же поиск. Кнопка «скачать» под отфильтрованным списком,
                отдающая файл про что-то другое, — обман. */}
            {shown.length > 0 ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => exportBookings(shown, slug, t, timeZone)}
              >
                <Icon name="download" className="ico-18" />
                <span>{t.bookings.exportCsv}</span>
              </button>
            ) : null}

            {/* Белая пилюля, а не розовая: единственная розовая на экране —
                «Создать» в инструментах оболочки, и это то же действие. */}
            <button
              type="button"
              className="btn btn-secondary page-action--create"
              onClick={() => setSheetOpen(true)}
            >
              <Icon name="plus" className="ico-18" />
              <span>{t.bookings.new}</span>
            </button>
          </>
        }
      />

      <AttentionCard
        bookings={pending}
        busyId={sheets.updatingId}
        onConfirm={(booking) => sheets.setStatus(booking, 'confirmed')}
        onDecline={(booking) => sheets.setStatus(booking, 'cancelled_by_master')}
      />

      <div className="bookings-filters">
        <div className="seg" role="tablist" aria-label={t.nav.bookings}>
          {POSTURES.map((item) => (
            <div
              key={item}
              role="tab"
              tabIndex={0}
              aria-selected={posture === item}
              className={posture === item ? 'is-on' : undefined}
              onClick={() => setPosture(item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setPosture(item);
              }}
            >
              {item === 'upcoming'
                ? t.bookings.tabUpcoming
                : item === 'past'
                  ? t.bookings.tabPast
                  : t.bookings.tabAll}
            </div>
          ))}
        </div>

        {/* Отбор по статусу — тем же набором, что и раньше: он предметный, а
            не оформительский, и менялся бы вместе со статусами записи. */}
        <label className="chip bookings-select">
          <span className="muted">{t.bookings.colStatus}</span>
          <select
            value={filter}
            onChange={(event) => applyFilter(event.target.value as BookingFilter)}
            aria-label={t.bookings.colStatus}
          >
            {getBookingStatusFilters(t).map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        {organization ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRulesOpen(true)}>
            <Icon name="sliders" className="ico-18" />
            <span>{t.bookings.howToAccept}</span>
          </button>
        ) : null}

        <span className="bookings-count">
          {fmt(t.bookings.countLabel, { count: shown.length })}
        </span>
      </div>

      {isError ? (
        <LoadError onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          {/* Один список в двух видах: таблица на большом экране, ряды на
              телефоне. В макете это разные экраны, и подписи «Дата:» перед
              каждой ячейкой в них нет. */}
          <div className="only-wide">
            <BookingsTable
              bookings={shown}
              todayKey={today}
              tomorrowKey={tomorrow}
              onOpen={(booking) => sheets.view(booking.id)}
            />
          </div>
          <div className="only-phone card" style={{ padding: 0, overflow: 'hidden' }}>
            <BookingsList
              bookings={shown}
              todayKey={today}
              tomorrowKey={tomorrow}
              onOpen={(booking) => sheets.view(booking.id)}
            />
          </div>
        </>
      )}

      {/* Архив открывается порциями: раскрытие тянет всю историю с сервера,
          и просить её, пока мастер смотрит ближайшие, незачем. */}
      {posture !== 'upcoming' && !historyWanted ? (
        <button
          type="button"
          className="btn btn-secondary bookings-more"
          onClick={() => setPastShown((value) => value + PAST_PAGE_SIZE)}
        >
          {fmt(t.common.showMore, { count: PAST_PAGE_SIZE })}
        </button>
      ) : null}

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
