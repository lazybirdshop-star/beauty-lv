'use client';

import { Plus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { listSlots } from '../../scheduling/api';
import { listServices } from '../../services/api';
import { createBooking, listBookings, updateBookingStatus } from '../api';
import { useT } from '@/lib/i18n';
import type { Messages } from '@/lib/i18n/messages';

import { getBookingStatusFilters } from '../status-meta';
import { getMyOrganization, updateBookingAcceptance } from '@/features/organization-profile/api';
import { listClients } from '@/features/clients/api';
import { ClientDetailSheet } from '@/features/clients/components/client-detail-sheet';
import { getClientBookings, getClientVisitStats } from '@/features/clients/visit-stats';
import type { Client } from '@/features/clients/types';
import type { Booking, BookingStatus } from '../types';
import { BookingListItem } from './booking-list-item';
import { NewBookingSheet } from './new-booking-sheet';

export function BookingsScreen({ slug }: { slug: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const bookingsKey = ['bookings', slug];

  const { data: bookings, isLoading } = useQuery({
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

  const [filter, setFilter] = useState<'all' | BookingStatus>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [openClient, setOpenClient] = useState<Client | null>(null);

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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingsKey });
      void queryClient.invalidateQueries({ queryKey: ['slots', slug] });
    },
  });

  const availableSlots = (slots ?? []).filter((slot) => slot.status === 'available');
  const filtered = (bookings ?? []).filter((booking: Booking) =>
    filter === 'all' ? true : booking.status === filter,
  );

  /*
   * Grouped by what the master has to do about them, not by status name. A
   * flat list sorted by date buries the one thing that needs an answer today
   * among a hundred that do not, and the pending filter only helps someone
   * who already knows to look for it.
   */
  const groups = useMemo(() => groupByAttention(filtered, t), [filtered, t]);

  return (
    <div className="flex flex-col gap-4">
      {/* The action stays on its own line above the filters: on a phone the
          scrolling chip row and a fixed-width button shared one line and the
          button covered the last filter. Order matters too — a filter row
          belongs directly above the list it filters, not separated from it by
          a button that has nothing to do with filtering. */}
      <div className="flex flex-col gap-3">
        <Button size="sm" onClick={() => setSheetOpen(true)} className="self-start">
          <Plus size={16} weight="bold" />
          {t.bookings.new}
        </Button>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {getBookingStatusFilters(t).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              aria-pressed={filter === item.key}
              className={cn(
                'inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full px-4 text-sm font-semibold',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                filter === item.key
                  ? 'bg-accent text-accent-contrast'
                  : 'bg-bg-sunken text-ink-soft hover:text-ink',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : groups.length > 0 ? (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.key} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3 px-1">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-soft">
                  {group.title}
                </h2>
                <span className="text-xs tabular-nums text-ink-faint">{group.items.length}</span>
              </div>
              {group.hint ? (
                <p className="-mt-1 px-1 text-xs text-ink-faint">{group.hint}</p>
              ) : null}

              {group.items.map((booking) => (
                <BookingListItem
                  key={booking.id}
                  booking={booking}
                  client={clientByPhone.get((booking.guestPhone ?? '').replace(/\D/g, '')) ?? null}
                  onOpenClient={() => {
                    const found = clientByPhone.get((booking.guestPhone ?? '').replace(/\D/g, ''));
                    if (found) setOpenClient(found);
                  }}
                  onSetStatus={(status) => statusMutation.mutate({ id: booking.id, status })}
                  updating={updatingId === booking.id}
                />
              ))}
            </section>
          ))}
        </div>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">{t.bookings.empty}</Card>
      )}

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
function groupByAttention(bookings: Booking[], t: Messages): BookingGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000;
  const isOver = (status: Booking['status']) =>
    status === 'completed' ||
    status === 'no_show' ||
    status === 'cancelled_by_client' ||
    status === 'cancelled_by_master';

  const pending: Booking[] = [];
  const today: Booking[] = [];
  const upcoming: Booking[] = [];
  const past: Booking[] = [];

  for (const booking of bookings) {
    const at = new Date(booking.startsAt).getTime();
    if (booking.status === 'pending') pending.push(booking);
    else if (isOver(booking.status) || at < startOfToday) past.push(booking);
    else if (at < endOfToday) today.push(booking);
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
      { key: 'today', title: t.bookings.groupToday, items: today.sort(byTime) },
      { key: 'upcoming', title: t.bookings.groupUpcoming, items: upcoming.sort(byTime) },
      { key: 'past', title: t.bookings.groupPast, items: past.sort(byTime).reverse() },
    ] as BookingGroup[]
  ).filter((group) => group.items.length > 0);
}
