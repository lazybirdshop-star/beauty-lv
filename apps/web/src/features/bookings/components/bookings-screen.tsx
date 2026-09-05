'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { describeApiError } from '@/lib/describe-api-error';
import { SEARCH_THRESHOLD } from '@/lib/list-search';
import { fromDayWindow } from '@/lib/time-window';
import { addDaysToKey, todayKey } from '@/lib/civil-date';

import { listSlots } from '../../scheduling/api';
import { bookableSlots } from '../../scheduling/bookable';
import { listServices } from '../../services/api';
import { createBooking, listBookings, updateBookingDetails, updateBookingStatus } from '../api';
import { exportBookings } from '../export';
import { searchBookings } from '../search';
import { getBookingStatusFilters } from '../status-meta';
import { BookingRulesSheet } from './booking-rules-sheet';
import { getMyOrganization } from '@/features/organization-profile/api';
import type { Booking, BookingStatus, UpdateBookingInput } from '../types';
import { matchesFilter, parseBookingFilter, type BookingFilter } from '../filter';
import { AttentionCard } from './attention-card';
import { BookingsTable } from './bookings-table';
import { EditBookingSheet } from './edit-booking-sheet';
import { NewBookingSheet } from './new-booking-sheet';

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
  const toast = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<BookingFilter>(
    () => initialFilter ?? readStoredFilter(slug),
  );
  const [posture, setPosture] = useState<Posture>('upcoming');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  /* Id, а не снимок клиента: шторка обязана показывать состояние, которое у
     него **сейчас**, а захваченный объект после блокировки продолжал бы
     говорить «Заблокировать» под кнопкой, которая уже сработала. Тот же приём,
     что и на экране клиентов. */
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  /* Id, а не снимок: пока шторка открыта, ответ на запись мог прийти с другого
     устройства, и форма обязана править то, чем запись стала. */
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const editMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBookingInput }) =>
      updateBookingDetails(slug, id, input),
    onSuccess: () => {
      /* Гасится и список записей, и окна: правка состава услуг меняет
         длительность визита, а значит и то, какие окна он занимает. */
      void queryClient.invalidateQueries({ queryKey: allBookingsKey });
      void queryClient.invalidateQueries({ queryKey: ['slots', slug] });
      setEditingId(null);
      toast({ message: t.bookings.editSaved });
    },
    /* Тоста об ошибке здесь нет намеренно: причину показывает сама форма
       строкой под полями, и шторка остаётся открытой — «не хватает времени
       подряд» это то, с чем мастер сейчас будет что-то делать. */
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      updateBookingStatus(slug, id, status),
    onMutate: ({ id }) => setUpdatingId(id),
    onSettled: () => setUpdatingId(null),
    /* A failed tap must not be silent: «Подтвердить» in a stairwell with no
       signal looked exactly like success (audit P0). */
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: allBookingsKey });
      void queryClient.invalidateQueries({ queryKey: ['slots', slug] });
    },
  });

  /*
   * Two destructive paths, two shapes of forgiveness. Cancelling someone's
   * booking is socially expensive and rare — it asks first, naming what the
   * client will see. «Не пришёл» is frequent and sits next to «Завершить»,
   * so it acts immediately and hands back an undo instead of a question.
   */
  function handleSetStatus(booking: Booking, status: BookingStatus) {
    if (status === 'cancelled_by_master') {
      setCancellingBooking(booking);
      return;
    }
    if (status === 'no_show') {
      const revertTo = booking.status;
      statusMutation.mutate(
        { id: booking.id, status },
        {
          onSuccess: () =>
            toast({
              message: t.bookings.noShowMarked,
              actionLabel: t.common.undo,
              onAction: () => statusMutation.mutate({ id: booking.id, status: revertTo }),
            }),
        },
      );
      return;
    }
    statusMutation.mutate({ id: booking.id, status });
  }

  /* Только будущие: см. `bookable.ts` — свободного статуса мало, окно прошлой
     недели остаётся `available` навсегда. */
  const availableSlots = bookableSlots(slots ?? []);

  /* Два разных вопроса — два контрола: фильтр отвечает «что мне сейчас
     делать», поиск — «а что там было у Анны» (см. `search.ts`). */
  const searched = useMemo(() => searchBookings(bookings ?? [], query), [bookings, query]);

  const showSearch = (bookings?.length ?? 0) >= SEARCH_THRESHOLD;
  const editingBooking = bookings?.find((booking) => booking.id === editingId) ?? null;

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
                className="btn btn-secondary"
                onClick={() => exportBookings(shown, slug, t, timeZone)}
              >
                <Icon name="download" className="ico-18" />
                <span>{t.bookings.exportCsv}</span>
              </button>
            ) : null}

            <button type="button" className="btn btn-primary" onClick={() => setSheetOpen(true)}>
              <Icon name="plus" className="ico-18" />
              <span>{t.bookings.new}</span>
            </button>
          </>
        }
      />

      <AttentionCard
        bookings={pending}
        busyId={updatingId}
        onConfirm={(booking) => handleSetStatus(booking, 'confirmed')}
        onDecline={(booking) => handleSetStatus(booking, 'cancelled_by_master')}
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
        <BookingsTable
          bookings={shown}
          todayKey={today}
          tomorrowKey={tomorrow}
          onOpen={(booking) => setEditingId(booking.id)}
        />
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

      <ConfirmSheet
        open={Boolean(cancellingBooking)}
        onOpenChange={(next) => !next && setCancellingBooking(null)}
        title={t.bookings.cancelConfirmTitle}
        description={
          cancellingBooking
            ? fmt(t.bookings.cancelConfirmText, { name: cancellingBooking.guestName ?? '' })
            : undefined
        }
        confirmLabel={t.bookings.cancelBooking}
        loading={statusMutation.isPending}
        onConfirm={() => {
          if (!cancellingBooking) return;
          statusMutation.mutate(
            { id: cancellingBooking.id, status: 'cancelled_by_master' },
            { onSuccess: () => setCancellingBooking(null) },
          );
        }}
      />

      <EditBookingSheet
        open={Boolean(editingBooking)}
        onOpenChange={(next) => !next && setEditingId(null)}
        booking={editingBooking}
        services={services ?? []}
        submitting={editMutation.isPending}
        onSubmit={async (input) => {
          if (!editingBooking) return;
          await editMutation.mutateAsync({ id: editingBooking.id, input });
        }}
      />

      <NewBookingSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        availableSlots={availableSlots}
        services={services ?? []}
        onSubmit={async (input) => {
          await createMutation.mutateAsync(input);
        }}
        submitting={createMutation.isPending}
      />
    </>
  );
}
