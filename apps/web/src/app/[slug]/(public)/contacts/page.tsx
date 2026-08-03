import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { ContactsCard } from '@/features/public-profile/components/contacts-card';
import { ContactsCard as SoftContactsCard } from '@/features/public-profile/soft/contacts-card';
import { getOrganizationBySlug } from '@/features/public-profile/data';

interface ContactsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ContactsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return {};
  return { title: `Контакты — ${org.name}` };
}

export default async function ContactsPage({ params }: ContactsPageProps) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);

  if (!org) {
    notFound();
  }

  return org.designPresetKey === 'soft' ? (
    <SoftContactsCard org={org} />
  ) : (
    <ContactsCard org={org} />
  );
}
