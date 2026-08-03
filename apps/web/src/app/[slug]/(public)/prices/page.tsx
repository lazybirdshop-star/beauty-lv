import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { ServiceList } from '@/features/public-profile/components/service-list';
import { ServiceList as SoftServiceList } from '@/features/public-profile/soft/service-list';
import { getOrganizationBySlug } from '@/features/public-profile/data';

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

  return org.designPresetKey === 'soft' ? <SoftServiceList org={org} /> : <ServiceList org={org} />;
}
