import { resolveThemeColors, type ThemeOverrides } from '@amolie/shared-kernel';
import type { Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { I18nProvider } from '@/lib/i18n';
import { getOrganizationBySlug } from '@/features/public-profile/engine/data';
import { CompositionHost } from '@/features/public-profile/registry/composition-host';

interface OrgLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

/**
 * Stands in for the tenant subdomain `{slug}.amolie.com` (see
 * ARCHITECTURE.md §3) until the edge tenant-resolution middleware exists.
 * The route shape is deliberately the same one that middleware will later
 * rewrite `{username}.amolie.com/*` onto.
 */
/**
 * The phone's address bar takes the master's own ground, not the product's.
 * The root layout can only declare one static pair, and it declares the
 * dashboard's; above an ink-navy poster that read as a stripe of the retired
 * palette. `getOrganizationBySlug` is React-cached, so this costs no extra
 * request beyond the one the layout already makes.
 */
export async function generateViewport({ params }: OrgLayoutProps): Promise<Viewport> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return {};

  const colors = resolveThemeColors(
    org.themePresetKey,
    org.themeOverrides as ThemeOverrides | null,
  );
  return { themeColor: colors.bg };
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);

  if (!org) {
    notFound();
  }

  /* Сборка мира целиком живёт в `CompositionHost` — том же, что рендерит
     холст Студии. Маршруту остаётся язык страницы. */
  return (
    <I18nProvider locale={org.defaultLocale}>
      <CompositionHost org={org}>{children}</CompositionHost>
    </I18nProvider>
  );
}
