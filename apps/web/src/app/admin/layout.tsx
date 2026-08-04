import type { ReactNode } from 'react';

import { DashboardProviders } from '@/app/providers';
import { DashboardShell } from '@/features/dashboard-shell/components/dashboard-shell';
import { DEFAULT_LOCALE, I18nProvider } from '@/lib/i18n';
import { getMessages } from '@/lib/i18n/resolve';
import { serverApiFetch } from '@/lib/server-api';

/**
 * Coarse role gate already happened in middleware.ts (edge, JWT-only).
 * Nothing here re-checks the role — that would be exactly the "проверять
 * роли внутри компонентов" the spec forbids.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  // The admin's own language setting, read the same way the master's dashboard
  // reads it. A failed call is not a reason to bounce an authenticated admin to
  // the login screen — the panel simply opens in the default language.
  let locale = DEFAULT_LOCALE as string;
  try {
    const me = await serverApiFetch<{ user?: { locale?: string } }>('/auth/me');
    locale = me.user?.locale ?? DEFAULT_LOCALE;
  } catch {
    locale = DEFAULT_LOCALE;
  }

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
