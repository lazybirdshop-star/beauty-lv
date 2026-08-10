import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { getOrganizationBySlug } from '@/features/public-profile/engine/data';
import { ContactsHost } from '@/features/public-profile/registry/contacts-host';

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

  /* Thin route (§8.2): the world's contacts section renders from the
     composition under CompositionRoot. */
  return <ContactsHost org={org} />;
}
