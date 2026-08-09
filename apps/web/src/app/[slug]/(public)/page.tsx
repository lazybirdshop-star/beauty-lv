import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { getMessages } from '@/lib/i18n/resolve';
import { BookingCalendar } from '@/features/public-profile/components/booking-calendar';
import { BookingCalendar as SoftBookingCalendar } from '@/features/public-profile/soft/booking-calendar';
import { getOrganizationBySlug, getPublishedSlots } from '@/features/public-profile/engine/data';

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

  // Each arrangement ships its own schedule: the panel component serves every
  // design but the poster — the six brand styles included — with geometry
  // arriving through the surface tokens. The poster keeps its own calendar.
  return org.designPresetKey !== 'poster' ? (
    <SoftBookingCalendar org={org} initialSlots={slots} />
  ) : (
    <BookingCalendar org={org} initialSlots={slots} />
  );
}
