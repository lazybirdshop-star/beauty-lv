import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { workspaceCapabilities } from '@/features/dashboard-shell/capabilities';
import { PayoutsScreen } from '@/features/payroll/components/payouts-screen';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { requireOrganization } from '@/lib/require-organization';

export async function generateMetadata(): Promise<Metadata> {
  return { title: getMessages(await getRequestLocale()).payroll.title };
}

export default async function PayoutsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const organization = await requireOrganization(slug);
  const capabilities = workspaceCapabilities(organization.role, organization.teamSize);

  /* Ведомость всех — владелице, свой заработок — наёмному мастеру.
     Администратору салона выплат людей не положено; сервер ответил бы тем же. */
  if (capabilities.canManagePayouts) {
    return <PayoutsScreen slug={slug} mode="manage" memberId={organization.memberId} />;
  }
  if (capabilities.canViewOwnPayouts) {
    return <PayoutsScreen slug={slug} mode="own" memberId={organization.memberId} />;
  }
  notFound();
}
