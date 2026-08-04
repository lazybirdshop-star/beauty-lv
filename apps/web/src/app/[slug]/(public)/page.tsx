import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { getMessages } from '@/lib/i18n/resolve';
import { BookingCalendar } from '@/features/public-profile/components/booking-calendar';
import { BookingCalendar as SoftBookingCalendar } from '@/features/public-profile/soft/booking-calendar';
import { getOrganizationBySlug, getPublishedSlots } from '@/features/public-profile/data';

interface OrgPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: OrgPageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return {};
  return {
    title: `${org.name} — ${getMessages(org.defaultLocale).publicPage.bookOnline}`,
    description: org.tagline,
  };
}

export default async function OrgHomePage({ params }: OrgPageProps) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);

  if (!org) {
    notFound();
  }

  const slots = await getPublishedSlots(slug);

  // Each design ships its own schedule: the soft one is the pre-redesign
  // component restored from the backup, not the poster one restyled.
  return org.designPresetKey === 'soft' ? (
    <SoftBookingCalendar org={org} initialSlots={slots} />
  ) : (
    <BookingCalendar org={org} initialSlots={slots} />
  );
}
