import type { ReactNode } from 'react';

import { DashboardProviders } from '@/app/providers';
import { I18nProvider } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/i18n/server';
import { FALLBACK_TIMEZONE, requireOrganization } from '@/lib/require-organization';
import { TimeZoneProvider } from '@/lib/timezone';

interface StudioLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

/**
 * Каркас режима Студии: та же охрана входа и те же провайдеры, что у
 * кабинета, но без `DashboardShell`.
 *
 * Студия — режим, а не вкладка (DESIGN_STUDIO.md §1): экран целиком отдаётся
 * странице и её облику, и навигация кабинета в нём была бы вторым хозяином
 * экрана. Выход из режима — явное действие верхней панели, а не пункт меню.
 */
export default async function StudioLayout({ children, params }: StudioLayoutProps) {
  const { slug } = await params;
  const organization = await requireOrganization(slug);

  const locale = await getRequestLocale();

  return (
    <DashboardProviders>
      <I18nProvider locale={locale}>
        <TimeZoneProvider timeZone={organization.timezone || FALLBACK_TIMEZONE}>
          {children}
        </TimeZoneProvider>
      </I18nProvider>
    </DashboardProviders>
  );
}
