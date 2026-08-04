import type { ReactNode } from 'react';

import { DashboardProviders } from '@/app/providers';
import { DashboardShell } from '@/features/dashboard-shell/components/dashboard-shell';
import { I18nProvider } from '@/lib/i18n';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';

/**
 * Coarse role gate already happened in middleware.ts (edge, JWT-only).
 * Nothing here re-checks the role — that would be exactly the "проверять
 * роли внутри компонентов" the spec forbids.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  const t = getMessages(locale);

  return (
    <DashboardProviders>
      <I18nProvider locale={locale}>
        <DashboardShell nav={{ role: 'admin' }} panelLabel={t.nav.adminPanel}>
          {children}
        </DashboardShell>
      </I18nProvider>
    </DashboardProviders>
  );
}
