import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { DashboardProviders } from '@/app/providers';
import { DashboardShell } from '@/features/dashboard-shell/components/dashboard-shell';
import { serverApiFetch } from '@/lib/server-api';
import { DEFAULT_LOCALE, I18nProvider } from '@/lib/i18n';

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
  let locale = DEFAULT_LOCALE as string;
  try {
    organization = await serverApiFetch<OrganizationMe>('/organizations/me');
    // The master's own setting, not the organisation's: she may run a Latvian
    // page from a Russian panel.
    const me = await serverApiFetch<{ user?: { locale?: string } }>('/auth/me');
    locale = me.user?.locale ?? DEFAULT_LOCALE;
  } catch {
    redirect('/login');
  }

  if (organization.slug !== slug) {
    redirect(`/${organization.slug}/dashboard`);
  }

  return (
    <DashboardProviders>
      <I18nProvider locale={locale}>
        <DashboardShell nav={{ role: 'master', slug }} panelLabel={organization.name}>
          {children}
        </DashboardShell>
      </I18nProvider>
    </DashboardProviders>
  );
}
