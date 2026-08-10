import { resolveDesign, resolveThemeColors, type ThemeOverrides } from '@amolie/shared-kernel';
import type { Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { AmbientBackdrop } from '@/components/ui/ambient-backdrop';
import { I18nProvider } from '@/lib/i18n';
import { getOrganizationBySlug } from '@/features/public-profile/engine/data';
import { resolveBrandStyleKey } from '@/features/public-profile/registry/brand-style';
import { CompositionRoot } from '@/features/public-profile/registry/brand-style-registry';
import { ShellHost } from '@/features/public-profile/registry/shell-host';
import { ThemeStyle } from '@/features/public-profile/shared/theme-style';

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

  /*
   * The route layer no longer knows how the worlds are arranged: the key
   * resolves to a composition (BRAND_STYLE_ARCHITECTURE.md §8) and the
   * world's own `Shell` lays out the hero, the panel and the pages. What
   * stays here is world-agnostic infrastructure — token emission and the
   * page background.
   */
  const design = resolveDesign(org.designPresetKey);

  const background = org.backgroundImageUrl ? (
    <div aria-hidden="true" className="fixed inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={org.backgroundImageUrl} alt="" className="h-full w-full object-cover" />
      {/* Scrim over a master's own background photo. Readability does not rest
          on it — every block above carries its own ground — so it only has to
          keep the palette present, not hide the picture. */}
      <div className="absolute inset-0 bg-bg/45" />
    </div>
  ) : /* Ambient light exists so frosted panes have something to frost. A
      world without glass (blur 0 — Editorial, Minimal, Luxury, Organic,
      poster) gets none: emptiness is the material there, not a missing
      decoration. */
  design.surfaces.blur !== '0px' ? (
    /* Fixed so the frosted panels have real colour to blur against. */
    <AmbientBackdrop className="fixed" />
  ) : null;

  return (
    <I18nProvider locale={org.defaultLocale}>
      <div className="relative min-h-[100dvh] bg-bg">
        <ThemeStyle
          designPresetKey={org.designPresetKey}
          themePresetKey={org.themePresetKey}
          fontPresetKey={org.fontPresetKey}
          themeOverrides={org.themeOverrides}
        />

        {background}

        <CompositionRoot styleKey={resolveBrandStyleKey(org.designPresetKey)}>
          <ShellHost org={org}>{children}</ShellHost>
        </CompositionRoot>
      </div>
    </I18nProvider>
  );
}
