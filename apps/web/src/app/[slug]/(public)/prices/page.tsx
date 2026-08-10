import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { getOrganizationBySlug } from '@/features/public-profile/engine/data';
import { ServiceListHost } from '@/features/public-profile/registry/service-list-host';

interface PricesPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PricesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return {};
  return { title: `Цены — ${org.name}` };
}

export default async function PricesPage({ params }: PricesPageProps) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);

  if (!org) {
    notFound();
  }

  /* Thin route (§8.2): the world's service-list section renders from the
     composition under CompositionRoot. */
  return <ServiceListHost org={org} />;
}
