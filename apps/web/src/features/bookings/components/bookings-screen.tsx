'use client';

import { Plus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { listSlots } from '../../scheduling/api';
import { listServices } from '../../services/api';
import { createBooking, listBookings, updateBookingStatus } from '../api';
import { BOOKING_STATUS_FILTERS } from '../status-meta';
import type { Booking, BookingStatus } from '../types';
import { BookingListItem } from './booking-list-item';
import { NewBookingSheet } from './new-booking-sheet';

export function BookingsScreen({ slug }: { slug: string }) {
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto">
          {BOOKING_STATUS_FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold',
                filter === item.key
                  ? 'bg-accent text-accent-contrast'
                  : 'bg-bg-sunken text-ink-soft',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setSheetOpen(true)} className="shrink-0">
          <Plus size={16} weight="bold" />
          Новая запись
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filtered.map((booking) => (
            <BookingListItem
              key={booking.id}
              booking={booking}
              onSetStatus={(status) => statusMutation.mutate({ id: booking.id, status })}
              updating={updatingId === booking.id}
            />
          ))}
        </div>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">Записей пока нет.</Card>
      )}

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
