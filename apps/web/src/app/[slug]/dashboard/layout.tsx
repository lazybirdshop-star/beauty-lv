import type { ReactNode } from 'react';

import { DashboardProviders } from '@/app/providers';
import { DashboardShell } from '@/features/dashboard-shell/components/dashboard-shell';
import { I18nProvider } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/i18n/server';
import { requireOrganization } from '@/lib/require-organization';

interface DashboardLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { slug } = await params;

  const organization = await requireOrganization(slug);

  // The master's own setting, not the organisation's: she may run a Latvian
  // page from a Russian panel.
  const locale = await getRequestLocale();

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
