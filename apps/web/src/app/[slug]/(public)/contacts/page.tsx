import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { ContactsCard } from '@/features/public-profile/components/contacts-card';
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

  return <ContactsCard org={org} />;
}
