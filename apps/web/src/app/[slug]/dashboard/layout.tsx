import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { cookies } from 'next/headers';

import { DashboardProviders } from '@/app/providers';
import { SupportModeBanner } from '@/features/admin/masters/components/support-mode-banner';
import { IMPERSONATOR_TOKEN_COOKIE } from '@/lib/auth-session';
import { DashboardShell } from '@/features/dashboard-shell/components/dashboard-shell';
import { I18nProvider } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/i18n/server';
import { FALLBACK_TIMEZONE, requireOrganization } from '@/lib/require-organization';
import { TimeZoneProvider } from '@/lib/timezone';

interface DashboardLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

/**
 * Свой манифест, а не корневой: тот описывает витрину продукта и стартует с
 * лендинга, поэтому иконка кабинета, поставленная на экран «Домой», открывала
 * бы рекламную страницу вместо записей на сегодня.
 *
 * Язык уезжает в адрес параметром, потому что манифест браузер запрашивает без
 * куки — сам обработчик мастера не узнает (см. комментарий в его `route.ts`).
 */
export async function generateMetadata({
  params,
}: Pick<DashboardLayoutProps, 'params'>): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();

  return {
    manifest: `/${encodeURIComponent(slug)}/dashboard/manifest.webmanifest?lang=${locale}`,
  };
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { slug } = await params;

  const organization = await requireOrganization(slug);

  // The master's own setting, not the organisation's: she may run a Latvian
  // page from a Russian panel.
  const locale = await getRequestLocale();

  /* Признак режима поддержки — соседняя кука с токеном администратора: сам
     токен доступа httpOnly, и разобрать его в браузере нечем. */
  const supportMode = (await cookies()).has(IMPERSONATOR_TOKEN_COOKIE);

  return (
    <DashboardProviders>
      <I18nProvider locale={locale}>
        {supportMode ? <SupportModeBanner masterName={organization.name} /> : null}
        {/* Пояс организации — свойство среды кабинета: сутки, часы окон и
            группы «сегодня/дальше» обязаны считаться по часам салона, а не по
            часам устройства, с которого мастер смотрит. */}
        <TimeZoneProvider timeZone={organization.timezone || FALLBACK_TIMEZONE}>
          <DashboardShell nav={{ role: 'master', slug }} panelLabel={organization.name}>
            {children}
          </DashboardShell>
        </TimeZoneProvider>
      </I18nProvider>
    </DashboardProviders>
  );
}
