import Link from 'next/link';
import { notFound } from 'next/navigation';

import { fetchPublicBooking } from '@/features/public-profile/engine/booking-status';
import { BookingStatusCard } from '@/features/public-profile/components/booking-status-card';
import { getOrganizationBySlug } from '@/features/public-profile/engine/data';
import { getMessages } from '@/lib/i18n/resolve';

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

  const t = getMessages(organization.defaultLocale);
  const soft = organization.designPresetKey !== 'poster';

  /* A bad token and a deleted booking look the same on purpose — the page must
     not become a way to find out whether a booking exists. */
  if (!booking) {
    return (
      <section className="flex flex-col items-center gap-3 px-5 py-16 text-center lg:px-7">
        <h1 className="font-display text-[24px] leading-tight text-ink">
          {t.publicPage.bookingNotFound}
        </h1>
        <p className="max-w-prose text-sm text-ink-soft">{t.publicPage.bookingNotFoundHint}</p>
        <Link
          href={`/${slug}`}
          className={`press mt-2 inline-flex min-h-11 items-center px-5 text-sm font-semibold text-ink ${
            soft ? 'rounded-full border border-border-strong' : 'border border-border-strong'
          }`}
        >
          {t.publicPage.toMasterPage}
        </Link>
      </section>
    );
  }

  return <BookingStatusCard org={organization} booking={booking} token={token} soft={soft} />;
}
