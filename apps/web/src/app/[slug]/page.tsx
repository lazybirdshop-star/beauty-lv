import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { BookingCalendar } from '@/features/public-profile/components/booking-calendar';
import { getAvailability, getOrganizationBySlug } from '@/features/public-profile/mock-data';
import type { DayAvailability } from '@/features/public-profile/types';

interface OrgPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string }>;
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

export default async function OrgHomePage({ params, searchParams }: OrgPageProps) {
  const { slug } = await params;
  const { service } = await searchParams;
  const org = await getOrganizationBySlug(slug);

  if (!org) {
    notFound();
  }

  const availabilityByService = org.services.reduce<Record<string, DayAvailability[]>>(
    (acc, item) => {
      acc[item.id] = getAvailability(org, item.durationMinutes);
      return acc;
    },
    {},
  );

  return (
    <BookingCalendar
      org={org}
      availabilityByService={availabilityByService}
      initialServiceId={service}
    />
  );
}
