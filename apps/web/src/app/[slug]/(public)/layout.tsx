import { resolvePageDesignTokens } from '@amolie/shared-kernel';
import type { Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { I18nProvider } from '@/lib/i18n';
import { KnownGuestProvider } from '@/features/client-account/known-guest';
import { getKnownGuest } from '@/features/client-account/server';
import { VisitReminderBanner } from '@/features/client-account/components/visit-reminder-banner';
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

  /* Тот же резолвер, что рисует страницу: земля, выбранная мастером в
     Студии, доезжает и до адресной строки телефона. */
  return { themeColor: resolvePageDesignTokens(org.design).colors.bg };
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);

  if (!org) {
    notFound();
  }

  /* Кто пришёл — на всю страницу мастера сразу: форма записи узнаёт своего
     человека и на календаре, и в прайсе, и на странице статуса записи. */
  const knownGuest = await getKnownGuest();

  /* Сборка мира целиком живёт в `CompositionHost` — том же, что рендерит
     холст Студии. Маршруту остаётся язык страницы. */
  return (
    <I18nProvider locale={org.defaultLocale}>
      <KnownGuestProvider guest={knownGuest}>
        {/* Снаружи мира намеренно: плашка о собственной записи принадлежит
            человеку, а не оформлению страницы, и в холсте Студии — где
            `CompositionHost` тот же самый, а посетителя нет — ей делать
            нечего. Палитру мира она всё равно получает: токены живут на
            `:root`. */}
        <VisitReminderBanner slug={org.slug} />
        <CompositionHost org={org}>{children}</CompositionHost>
      </KnownGuestProvider>
    </I18nProvider>
  );
}
