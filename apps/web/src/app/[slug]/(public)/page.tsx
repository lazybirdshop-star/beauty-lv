import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { getMessages } from '@/lib/i18n/resolve';
import { getOrganizationBySlug, getPublishedSlots } from '@/features/public-profile/engine/data';
import { CalendarHost } from '@/features/public-profile/registry/calendar-host';

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

  /* The route is thin (BRAND_STYLE_ARCHITECTURE.md §8.2): data in, the
     world's calendar section out — the composition under CompositionRoot
     decides what the schedule looks like. */
  return <CalendarHost org={org} initialSlots={slots} />;
}
