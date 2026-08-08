import { resolveThemeColors, type ThemeOverrides } from '@beauty-lv/shared-kernel';
import type { Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { I18nProvider } from '@/lib/i18n';
import { OrgHeader } from '@/features/public-profile/components/org-header';
import { OrgNav } from '@/features/public-profile/components/org-nav';
import { AmbientBackdrop } from '@/components/ui/ambient-backdrop';
import { OrgHeader as SoftOrgHeader } from '@/features/public-profile/soft/org-header';
import { OrgNav as SoftOrgNav } from '@/features/public-profile/soft/org-nav';
import { ThemeStyle } from '@/features/public-profile/components/theme-style';
import { getOrganizationBySlug } from '@/features/public-profile/data';

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
   * The two designs are two arrangements, not one arrangement with different
   * corner radii — the soft world puts the hero above a panel that rides up
   * over it, the poster world splits the screen into two fields. Tokens
   * cannot express that, so each world renders its own subtree.
   */
  const isSoft = org.designPresetKey === 'soft';

  const background = org.backgroundImageUrl ? (
    <div aria-hidden="true" className="fixed inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={org.backgroundImageUrl} alt="" className="h-full w-full object-cover" />
      {/* Scrim over a master's own background photo. Readability does not rest
          on it — every block above carries its own ground — so it only has to
          keep the palette present, not hide the picture. */}
      <div className="absolute inset-0 bg-bg/45" />
    </div>
  ) : isSoft ? (
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

        {isSoft ? (
          <div className="relative mx-auto flex min-h-[100dvh] max-w-[520px] flex-col lg:max-w-6xl lg:flex-row lg:items-start lg:gap-8 lg:px-8 lg:py-10">
            <div className="lg:sticky lg:top-10 lg:w-[340px] lg:shrink-0 xl:w-[380px]">
              <SoftOrgHeader org={org} />
            </div>

            {/* The signature overlap: the panel rides up over the hero and blurs
              it, so the hero visibly passes underneath instead of stopping at
              a seam. Side by side there is no seam to hide, so from `lg` it
              becomes a plain card. */}
            <div
              className={cn(
                /* The hero runs on under the panel rather than stopping at a
                 seam: a deeper overlap, and the panel's own blur is what the
                 hero is seen through. `panel` carries the design's glass
                 tokens — the light edge and the top sheen — so the boundary
                 reads as a lit pane laid over the image, not as a card
                 parked on top of it. */
                'panel relative -mt-24 flex-1 rounded-t-[32px] px-0 pb-0 pt-1',
                'lg:mt-0 lg:min-w-0 lg:self-stretch lg:rounded-[32px]',
              )}
            >
              <SoftOrgNav
                slug={org.slug}
                showPrices={org.showPricesSection}
                showContacts={org.showContactsSection}
              />
              {children}
            </div>
          </div>
        ) : (
          <div className="relative mx-auto flex min-h-[100dvh] max-w-[560px] flex-col lg:max-w-[1180px] lg:flex-row lg:items-stretch lg:gap-0">
            <div className="lg:sticky lg:top-0 lg:h-[100dvh] lg:w-[46%] lg:shrink-0">
              <OrgHeader org={org} />
            </div>

            {/* Flat field with a hard rule where the soft world has frosted glass
              riding over the hero: blur, rounded corners and a lifted shadow
              are the vocabulary this design refuses, and the seam is declared
              rather than hidden — a 2px vermilion rule. */}
            <div
              className={cn(
                'panel relative flex-1 border-t-2 border-accent px-0 pb-0 pt-0',
                'lg:min-w-0 lg:self-stretch lg:border-l-2 lg:border-t-0',
                org.backgroundImageUrl && 'bg-bg/90',
              )}
            >
              <OrgNav
                slug={org.slug}
                showPrices={org.showPricesSection}
                showContacts={org.showContactsSection}
                design={org.designPresetKey}
              />
              {children}
            </div>
          </div>
        )}
      </div>
    </I18nProvider>
  );
}
