'use client';

import { DownloadSimple, MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { phoneMatchKey } from '@amolie/shared-kernel';

import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Input } from '@/components/ui/input';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { SEARCH_THRESHOLD } from '@/lib/list-search';
import { fromDayWindow } from '@/lib/time-window';
import { addDaysToKey, todayKey } from '@/lib/civil-date';

import { listSlots } from '../../scheduling/api';
import { bookableSlots } from '../../scheduling/bookable';
import { listServices } from '../../services/api';
import { createBooking, listBookings, updateBookingDetails, updateBookingStatus } from '../api';
import { groupByAttention } from '../group-by-attention';
import { exportBookings } from '../export';
import { searchBookings } from '../search';
import { getBookingStatusFilters } from '../status-meta';
import { BookingRulesCard } from './booking-rules-card';
import { getMyOrganization } from '@/features/organization-profile/api';
import { listClientBookings, listClients, setClientBlocked } from '@/features/clients/api';
import { ClientDetailSheet } from '@/features/clients/components/client-detail-sheet';
import { getClientVisitStats } from '@/features/clients/visit-stats';
import type { Client } from '@/features/clients/types';
import type { Booking, BookingStatus, UpdateBookingInput } from '../types';
import { parseBookingFilter, type BookingFilter } from '../filter';
import { BookingListItem } from './booking-list-item';
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  /* Id, а не снимок клиента: шторка обязана показывать состояние, которое у
     него **сейчас**, а захваченный объект после блокировки продолжал бы
     говорить «Заблокировать» под кнопкой, которая уже сработала. Тот же приём,
     что и на экране клиентов. */
  const [openClientId, setOpenClientId] = useState<string | null>(null);
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
  const historyWanted = pastExpanded || query.trim().length > 0;

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

  const { data: clients } = useQuery({
    queryKey: ['clients', slug],
    queryFn: () => listClients(slug),
  });

  /* История клиента — по требованию и тем же ключом, что на экране клиентов:
     карточка, открытая отсюда и оттуда, обязана показывать одно и то же. */
  const { data: clientHistory } = useQuery({
    queryKey: ['client-bookings', slug, openClientId],
    queryFn: () => listClientBookings(slug, openClientId as string),
    enabled: Boolean(openClientId),
  });

  /* Same key the page editor uses, so the two screens never disagree about
     what the setting currently is. */
  const { data: organization } = useQuery({
    queryKey: ['my-organization'],
    queryFn: getMyOrganization,
  });

  /* Указатель «кто из адресной книги стоит за этой записью». Ключ — форма
     сравнения из ядра (`phoneMatchKey`, восемь последних цифр): та же, которой
     API решает этот вопрос при создании записи, поэтому кабинет и сервер не
     могут разойтись в том, кто есть кто. */
  const clientByPhone = useMemo(() => {
    const map = new Map<string, Client>();
    for (const client of clients ?? []) {
      const digits = phoneMatchKey(client.phone);
      /* Клиент без телефона в указатель не попадает: пустой ключ склеил бы
         всех безымянных в одного человека. */
      if (digits) map.set(digits, client);
    }
    return map;
  }, [clients]);

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createBooking>[1]) => createBooking(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: allBookingsKey });
      void queryClient.invalidateQueries({ queryKey: ['slots', slug] });
      setSheetOpen(false);
    },
  });

  /* Блокировка клиента — из того же места, где мастер её и решает.
     Шторка клиента, открытая отсюда, получала пустой обработчик: красная
     кнопка нажималась, ничего не делала и молчала об этом. Ключ инвалидации
     тот же, что у списка клиентов, — экраны не могут разойтись в том,
     заблокирован ли человек. */
  const blockMutation = useMutation({
    mutationFn: ({ id, isBlocked }: { id: string; isBlocked: boolean }) =>
      setClientBlocked(slug, id, isBlocked),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['clients', slug] }),
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
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

  const filtered = searched.filter((booking: Booking) =>
    filter === 'all' ? true : booking.status === filter,
  );
  const showSearch = (bookings?.length ?? 0) >= SEARCH_THRESHOLD;
  const openClient = clients?.find((client) => client.id === openClientId) ?? null;
  const editingBooking = bookings?.find((booking) => booking.id === editingId) ?? null;

  /*
   * Grouped by what the master has to do about them, not by status name. A
   * flat list sorted by date buries the one thing that needs an answer today
   * among a hundred that do not, and the pending filter only helps someone
   * who already knows to look for it.
   */
  const groups = useMemo(() => groupByAttention(filtered, t, timeZone), [filtered, t, timeZone]);

  return (
    <div className="flex flex-col gap-4">
      {/* The action stays on its own line above the filters: on a phone the
          scrolling chip row and a fixed-width button shared one line and the
          button covered the last filter. Order matters too — a filter row
          belongs directly above the list it filters, not separated from it by
          a button that has nothing to do with filtering. */}
      <Tabs value={filter} onValueChange={(next) => applyFilter(next as BookingFilter)}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 self-start">
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <Plus size={16} weight="bold" />
              {t.bookings.new}
            </Button>
            {/* Выгружается ровно то, что показывает экран: тот же отрезок
                времени и тот же поиск. Кнопка «скачать» под отфильтрованным
                списком, отдающая файл про что-то другое, — обман. */}
            {searched.length > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => exportBookings(searched, slug, t, timeZone)}
                title={t.bookings.exportCsv}
              >
                <DownloadSimple size={16} weight="bold" />
                {t.bookings.exportCsv}
              </Button>
            ) : null}
          </div>
          {/* Radix Tabs, not hand-made chips: the look is the same, the
              keyboard model (roving tabindex, arrow keys) comes for free. */}
          <TabsList className="self-start">
            {getBookingStatusFilters(t).map((item) => (
              <TabsTrigger
                key={item.key}
                value={item.key}
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-contrast"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Sticky, and below the filters on purpose: the filter is a posture
            she sets once on arrival, the search is what she reaches for
            halfway down the archive — so it is the one that must survive the
            scroll (§5.1). */}
        {showSearch ? (
          <div className="sticky top-16 z-20 -mx-1 mt-4 rounded-2xl bg-bg/85 px-1 py-1 backdrop-blur-md">
            <div className="relative">
              <MagnifyingGlass
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.bookings.searchPlaceholder}
                aria-label={t.bookings.searchPlaceholder}
                className="w-full pl-10"
              />
            </div>
          </div>
        ) : null}

        <TabsContent value={filter} className="mt-4">
          {isError ? (
            <LoadError onRetry={() => void refetch()} />
          ) : isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : groups.length > 0 ? (
            <div className="flex flex-col gap-6">
              {groups.map((group) => {
                const isPast = group.key === 'past';
                const visible = isPast ? group.items.slice(0, pastShown) : group.items;
                const hiddenCount = group.items.length - visible.length;
                return (
                  <section key={group.key} className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between gap-3 px-1">
                      <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-soft">
                        {group.title}
                      </h2>
                      <span className="text-xs tabular-nums text-ink-faint">
                        {group.items.length}
                      </span>
                    </div>
                    {group.hint ? (
                      <p className="-mt-1 px-1 text-xs text-ink-faint">{group.hint}</p>
                    ) : null}

                    {visible.map((booking) => (
                      <BookingListItem
                        key={booking.id}
                        booking={booking}
                        client={clientByPhone.get(phoneMatchKey(booking.guestPhone ?? '')) ?? null}
                        onOpenClient={() => {
                          const found = clientByPhone.get(phoneMatchKey(booking.guestPhone ?? ''));
                          if (found) setOpenClientId(found.id);
                        }}
                        onSetStatus={(status) => handleSetStatus(booking, status)}
                        onEdit={() => setEditingId(booking.id)}
                        updating={updatingId === booking.id}
                      />
                    ))}

                    {hiddenCount > 0 ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="self-center"
                        onClick={() => setPastShown((shown) => shown + PAST_PAGE_SIZE)}
                      >
                        {/* Обещает следующую порцию, а не весь остаток: кнопка,
                            говорящая «показать 300», обещает ровно то, чего
                            делать не следует. */}
                        {fmt(t.bookings.showPast, {
                          count: Math.min(hiddenCount, PAST_PAGE_SIZE),
                        })}
                      </Button>
                    ) : null}
                  </section>
                );
              })}
            </div>
          ) : (
            <Card className="py-12 text-center text-sm text-ink-soft">
              {query.trim() ? fmt(t.bookings.notFound, { query: query.trim() }) : t.bookings.empty}
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* At the foot of the screen on purpose. It decides how every future
          booking arrives, but a master changes it about once and reads this
          list several times a day — put at the top it would push the work she
          came for below the fold every single visit. */}
      {organization ? <BookingRulesCard slug={slug} organization={organization} /> : null}

      <ClientDetailSheet
        open={Boolean(openClient)}
        onOpenChange={(next) => !next && setOpenClientId(null)}
        client={openClient}
        /* История — этого клиента и по требованию, а не отбор из того, что
           случайно оказалось загружено. Раньше карточка показывала визиты,
           найденные среди записей **экрана**: с окном в тридцать дней она
           молча показывала бы неполную историю. */
        stats={openClient ? getClientVisitStats(openClient.visitStats, clientHistory ?? []) : null}
        history={clientHistory ?? []}
        onToggleBlocked={(client) =>
          blockMutation.mutate({ id: client.id, isBlocked: !client.isBlocked })
        }
        togglingBlocked={blockMutation.isPending}
      />

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
    </div>
  );
}
