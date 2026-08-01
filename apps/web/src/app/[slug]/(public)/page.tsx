import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { BookingCalendar } from '@/features/public-profile/components/booking-calendar';
import { getOrganizationBySlug, getPublishedSlots } from '@/features/public-profile/data';

interface OrgPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: OrgPageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return {};
  return {
    title: `${org.name} — запись онлайн`,
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

  return <BookingCalendar org={org} initialSlots={slots} />;
}
