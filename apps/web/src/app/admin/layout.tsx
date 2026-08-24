import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { DashboardProviders } from '@/app/providers';
import { DashboardShell } from '@/features/dashboard-shell/components/dashboard-shell';
import { I18nProvider } from '@/lib/i18n';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';

/**
 * Coarse role gate already happened in proxy.ts (edge, JWT-only — this is
 * Next 16's name for what used to be middleware.ts). Nothing here re-checks
 * the role — that would be exactly the "проверять роли внутри компонентов"
 * the spec forbids.
 */
/**
 * Свой манифест, а не корневой: тот стартует с лендинга, и иконка панели,
 * поставленная на экран «Домой», открывала бы рекламную страницу вместо
 * очереди заявок. Он же делает панель устанавливаемым приложением — на iOS
 * это единственный способ получать push-уведомления о заявках.
 */
export async function generateMetadata(): Promise<Metadata> {
  return { manifest: `/admin/manifest.webmanifest?lang=${await getRequestLocale()}` };
}

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
