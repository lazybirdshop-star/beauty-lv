import { notFound } from 'next/navigation';

import { fetchPublicBooking } from '@/features/public-profile/engine/booking-status';
import { getOrganizationBySlug } from '@/features/public-profile/engine/data';
import { BookingStatusHost } from '@/features/public-profile/registry/booking-status-host';

interface PageProps {
  params: Promise<{ slug: string; token: string }>;
}

/**
 * Nobody should find this page except the person holding the link, and search
 * engines least of all — it is one visitor's appointment.
 */
export const metadata = { robots: { index: false, follow: false } };

export default async function BookingStatusPage({ params }: PageProps) {
  const { slug, token } = await params;

  const [organization, booking] = await Promise.all([
    getOrganizationBySlug(slug),
    fetchPublicBooking(slug, token),
  ]);

  if (!organization) notFound();

  /* Thin route (§8.2, §14.3): the status screen is a shared utility card; the
     host dresses it in the rendering world's surfaces without a string branch
     on the design key. */
  return <BookingStatusHost slug={slug} org={organization} booking={booking} token={token} />;
}
