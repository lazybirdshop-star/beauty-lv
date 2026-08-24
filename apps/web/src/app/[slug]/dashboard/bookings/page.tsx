import type { Metadata } from 'next';
import { BookingsScreen } from '@/features/bookings/components/bookings-screen';
import { parseBookingFilter } from '@/features/bookings/filter';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';

interface BookingsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string }>;
}

/**
 * `?status=pending` is read here rather than with `useSearchParams` inside the
 * screen: the route already renders on the server, and a client hook reading
 * the address would need its own Suspense boundary to do the same job.
 */
/**
 * Свой заголовок вкладки.
 *
 * Все девять экранов кабинета назывались «AMOLIE»: в истории браузера, в
 * переключателе вкладок и в списке задач PWA они были неразличимы. Имя берётся
 * из того же словаря, что и подпись шапки, — два разных названия одного экрана
 * были бы новым расхождением вместо исправленного.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getRequestLocale());
  return { title: t.nav.bookings };
}

export default async function BookingsPage({ params, searchParams }: BookingsPageProps) {
  const [{ slug }, { status }] = await Promise.all([params, searchParams]);
  /* Absent means «no opinion», not «all»: passing a filter would overwrite the
     posture the master left behind on her last visit. */
  return (
    <BookingsScreen slug={slug} initialFilter={status ? parseBookingFilter(status) : undefined} />
  );
}
