import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { workspaceCapabilities } from '@/features/dashboard-shell/capabilities';
import { FrontDeskScreen } from '@/features/front-desk/components/front-desk-screen';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { requireOrganization } from '@/lib/require-organization';

export async function generateMetadata(): Promise<Metadata> {
  return { title: getMessages(await getRequestLocale()).nav.frontDesk };
}

export default async function FrontDeskPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const organization = await requireOrganization(slug);
  const capabilities = workspaceCapabilities(organization.role, organization.teamSize);

  /* Ресепшен — день всей команды: без команды и без права видеть чужое время
     это «Сегодня», уже открытое на главной. Адрес закрыт и здесь, а не только
     спрятан из меню. */
  if (!capabilities.canViewTeamCalendar || !capabilities.canManageBookings) notFound();

  return <FrontDeskScreen slug={slug} />;
}
