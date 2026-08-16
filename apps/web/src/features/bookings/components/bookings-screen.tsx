'use client';

import { MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { todayKey } from '@/lib/civil-date';
import { dayKey } from '@/lib/format';
import { fmt, useT } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Input } from '@/components/ui/input';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';

import { listSlots } from '../../scheduling/api';
import { listServices } from '../../services/api';
import { createBooking, listBookings, updateBookingStatus } from '../api';
import type { Messages } from '@/lib/i18n/messages';

import { getBookingStatusFilters } from '../status-meta';
import { getMyOrganization, updateBookingAcceptance } from '@/features/organization-profile/api';
import { listClients } from '@/features/clients/api';
import { ClientDetailSheet } from '@/features/clients/components/client-detail-sheet';
import { getClientBookings, getClientVisitStats } from '@/features/clients/visit-stats';
import type { Client } from '@/features/clients/types';
import type { Booking, BookingStatus } from '../types';
import { parseBookingFilter, type BookingFilter } from '../filter';
import { BookingListItem } from './booking-list-item';
import { NewBookingSheet } from './new-booking-sheet';

/** How many finished bookings show before «показать ещё» — the group is an archive, not the work. */
const PAST_PREVIEW_COUNT = 5;

/** Below this everything fits a screen or two and a search field is furniture. */
const SEARCH_THRESHOLD = 8;

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
  const bookingsKey = ['bookings', slug];

  const {
    data: bookings,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: bookingsKey,
    queryFn: () => listBookings(slug),
  });
  const { data: slots } = useQuery({
    queryKey: ['slots', slug],
    queryFn: () => listSlots(slug),
  });
  const { data: services } = useQuery({
    queryKey: ['services', slug],
    queryFn: () => listServices(slug),
  });

  const [filter, setFilter] = useState<BookingFilter>(
    () => initialFilter ?? readStoredFilter(slug),
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [openClient, setOpenClient] = useState<Client | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [pastExpanded, setPastExpanded] = useState(false);
  const [query, setQuery] = useState('');

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

  /* Same key the page editor uses, so the two screens never disagree about
     what the setting currently is. */
  const { data: organization } = useQuery({
    queryKey: ['my-organization'],
    queryFn: getMyOrganization,
  });

  const acceptanceMutation = useMutation({
    mutationFn: (autoConfirm: boolean) => updateBookingAcceptance(slug, autoConfirm),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['my-organization'] }),
    onError: () => toast({ message: t.common.actionFailed, tone: 'danger' }),
  });

  /* Matched on digits alone: a booking stores whatever the visitor typed,
     the address book stores a normalised number, and "+371 20 000 111" and
     "+37120000111" are the same person. */
  const clientByPhone = useMemo(() => {
    const digits = (value: string | null) => (value ?? '').replace(/\D/g, '');
    const map = new Map<string, Client>();
    for (const client of clients ?? []) map.set(digits(client.phone), client);
    return map;
  }, [clients]);

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createBooking>[1]) => createBooking(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingsKey });
      void queryClient.invalidateQueries({ queryKey: ['slots', slug] });
      setSheetOpen(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      updateBookingStatus(slug, id, status),
    onMutate: ({ id }) => setUpdatingId(id),
    onSettled: () => setUpdatingId(null),
    /* A failed tap must not be silent: «Подтвердить» in a stairwell with no
       signal looked exactly like success (audit P0). */
    onError: () => toast({ message: t.common.actionFailed, tone: 'danger' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingsKey });
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

  const availableSlots = (slots ?? []).filter((slot) => slot.status === 'available');

  /*
   * Two different questions, two controls. The filter answers «что мне сейчас
   * делать», search answers «а что там было у Анны» — and the archive group
   * makes the second one impossible to scroll to. Name and service match on
   * text, phone on digits alone, so «+371 20» finds «+37120000111».
   */
  const searched = useMemo(() => {
    const all = bookings ?? [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return all;
    const digits = trimmed.replace(/\D/g, '');
    return all.filter((booking) => {
      const name = (booking.guestName ?? '').toLowerCase();
      const services = booking.items
        .map((item) => item.serviceNameSnapshot)
        .join(' ')
        .toLowerCase();
      const phone = (booking.guestPhone ?? '').replace(/\D/g, '');
      return (
        name.includes(trimmed) ||
        services.includes(trimmed) ||
        (digits.length > 0 && phone.includes(digits))
      );
    });
  }, [bookings, query]);

  const filtered = searched.filter((booking: Booking) =>
    filter === 'all' ? true : booking.status === filter,
  );
  const showSearch = (bookings?.length ?? 0) >= SEARCH_THRESHOLD;

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
          <Button size="sm" onClick={() => setSheetOpen(true)} className="self-start">
            <Plus size={16} weight="bold" />
            {t.bookings.new}
          </Button>
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
                const visible =
                  isPast && !pastExpanded ? group.items.slice(0, PAST_PREVIEW_COUNT) : group.items;
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
                        client={
                          clientByPhone.get((booking.guestPhone ?? '').replace(/\D/g, '')) ?? null
                        }
                        onOpenClient={() => {
                          const found = clientByPhone.get(
                            (booking.guestPhone ?? '').replace(/\D/g, ''),
                          );
                          if (found) setOpenClient(found);
                        }}
                        onSetStatus={(status) => handleSetStatus(booking, status)}
                        updating={updatingId === booking.id}
                      />
                    ))}

                    {hiddenCount > 0 ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="self-center"
                        onClick={() => setPastExpanded(true)}
                      >
                        {fmt(t.bookings.showPast, { count: hiddenCount })}
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
      {organization ? (
        <Card className="mt-2">
          <CardHeader>
            <CardTitle>{t.bookings.howToAccept}</CardTitle>
          </CardHeader>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-bg-sunken px-4 py-3">
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{t.bookings.autoConfirm}</span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                {organization.autoConfirmBookings
                  ? t.bookings.autoConfirmOn
                  : t.bookings.autoConfirmOff}
              </span>
            </span>
            <Switch
              checked={organization.autoConfirmBookings}
              disabled={acceptanceMutation.isPending}
              onCheckedChange={(checked) => acceptanceMutation.mutate(checked)}
              label={t.bookings.autoConfirm}
            />
          </label>
        </Card>
      ) : null}

      <ClientDetailSheet
        open={Boolean(openClient)}
        onOpenChange={(next) => !next && setOpenClient(null)}
        client={openClient}
        stats={openClient ? getClientVisitStats(openClient, bookings ?? []) : null}
        history={openClient ? getClientBookings(openClient, bookings ?? []) : []}
        onToggleBlocked={() => undefined}
        togglingBlocked={false}
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

interface BookingGroup {
  key: string;
  title: string;
  hint?: string;
  items: Booking[];
}

/** Waiting first, then today, then what is coming, then what is over. */
function groupByAttention(bookings: Booking[], t: Messages, timeZone?: string): BookingGroup[] {
  /* Сутки принадлежат салону, а не устройству: «сегодня» на главной и
     «Сегодня» здесь обязаны означать один и тот же день, иначе одна и та же
     запись оказывается в разных сутках на соседних экранах. Сравниваются
     гражданские даты, а не моменты, — границы суток считать не нужно. */
  const today = todayKey(timeZone);
  const isOver = (status: Booking['status']) =>
    status === 'completed' ||
    status === 'no_show' ||
    status === 'cancelled_by_client' ||
    status === 'cancelled_by_master';

  const pending: Booking[] = [];
  const todays: Booking[] = [];
  const upcoming: Booking[] = [];
  const past: Booking[] = [];

  for (const booking of bookings) {
    const day = dayKey(booking.startsAt, timeZone);
    if (booking.status === 'pending') pending.push(booking);
    else if (isOver(booking.status) || day < today) past.push(booking);
    else if (day === today) todays.push(booking);
    else upcoming.push(booking);
  }

  const byTime = (a: Booking, b: Booking) =>
    new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();

  return (
    [
      {
        key: 'pending',
        title: t.bookings.groupPending,
        hint: t.bookings.groupPendingHint,
        items: pending.sort(byTime),
      },
      { key: 'today', title: t.bookings.groupToday, items: todays.sort(byTime) },
      { key: 'upcoming', title: t.bookings.groupUpcoming, items: upcoming.sort(byTime) },
      { key: 'past', title: t.bookings.groupPast, items: past.sort(byTime).reverse() },
    ] as BookingGroup[]
  ).filter((group) => group.items.length > 0);
}
