'use client';

import { useQuery } from '@tanstack/react-query';

import { listBookings } from './api';
import type { Booking } from './types';

/**
 * How many bookings are still waiting for the master's answer.
 *
 * Deliberately the same query key the bookings screen uses: confirming or
 * cancelling one already invalidates `['bookings', slug]`, so the nav badge
 * clears itself the moment the work is done — no second source of truth to
 * keep in step, and no extra request while she is on that screen.
 */
export function usePendingBookingsCount(slug: string | null): number {
  const { data } = useQuery({
    queryKey: ['bookings', slug],
    queryFn: () => listBookings(slug as string),
    enabled: Boolean(slug),
    select: (bookings: Booking[]) =>
      bookings.filter((booking) => booking.status === 'pending').length,
  });

  return data ?? 0;
}
