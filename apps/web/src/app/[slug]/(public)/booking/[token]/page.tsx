import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { fetchPublicBooking } from '@/features/public-profile/engine/booking-status';
import { getOrganizationBySlug } from '@/features/public-profile/engine/data';
import { BookingStatusHost } from '@/features/public-profile/registry/booking-status-host';
import { getMessages } from '@/lib/i18n/resolve';

interface PageProps {
  params: Promise<{ slug: string; token: string }>;
}

/**
 * Имя вкладки — имя мастера, а не «AMOLIE».
 *
 * Именно эту страницу человек сохраняет в закладки: она и есть его запись, и
 * найти её потом он будет по имени того, к кому идёт. Общий заголовок продукта
 * в списке закладок не отличим от любой другой его вкладки.
 *
 * Nobody should find this page except the person holding the link, and search
 * engines least of all — it is one visitor's appointment.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  const robots = { index: false, follow: false };
  if (!org) return { robots };

  return {
    title: `${getMessages(org.defaultLocale).publicPage.yourBooking} — ${org.name}`,
    robots,
  };
}

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
