import { BookingsScreen } from '@/features/bookings/components/bookings-screen';
import { parseBookingFilter } from '@/features/bookings/filter';

interface BookingsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string }>;
}

/**
 * `?status=pending` is read here rather than with `useSearchParams` inside the
 * screen: the route already renders on the server, and a client hook reading
 * the address would need its own Suspense boundary to do the same job.
 */
export default async function BookingsPage({ params, searchParams }: BookingsPageProps) {
  const [{ slug }, { status }] = await Promise.all([params, searchParams]);
  /* Absent means «no opinion», not «all»: passing a filter would overwrite the
     posture the master left behind on her last visit. */
  return (
    <BookingsScreen slug={slug} initialFilter={status ? parseBookingFilter(status) : undefined} />
  );
}
