import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { DashboardProviders } from '@/app/providers';
import { DashboardShell } from '@/features/dashboard-shell/components/dashboard-shell';
import { serverApiFetch } from '@/lib/server-api';

interface DashboardLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

interface OrganizationMe {
  slug: string;
  name: string;
}

/**
 * The fine-grained "is this the right organization for this user" check
 * middleware.ts can't do at the edge (dashboard-architecture plan §2) —
 * middleware only verifies there's a valid master/admin token at all.
 */
export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { slug } = await params;

  let organization: OrganizationMe;
  try {
    organization = await serverApiFetch<OrganizationMe>('/organizations/me');
  } catch {
    redirect('/login');
  }

  if (organization.slug !== slug) {
    redirect(`/${organization.slug}/dashboard`);
  }

  return (
    <DashboardProviders>
      <DashboardShell nav={{ role: 'master', slug }} panelLabel={organization.name}>
        {children}
      </DashboardShell>
    </DashboardProviders>
  );
}
