import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { AmbientBackdrop } from '@/components/ui/ambient-backdrop';
import { OrgHeader } from '@/features/public-profile/components/org-header';
import { OrgNav } from '@/features/public-profile/components/org-nav';
import { ThemeStyle } from '@/features/public-profile/components/theme-style';
import { getOrganizationBySlug } from '@/features/public-profile/data';

interface OrgLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

/**
 * Stands in for the tenant subdomain `{slug}.beauty.lv` (see
 * ARCHITECTURE.md §3) until the edge tenant-resolution middleware exists.
 * The route shape is deliberately the same one that middleware will later
 * rewrite `{username}.beauty.lv/*` onto.
 */
export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);

  if (!org) {
    notFound();
  }

  return (
    <div className="relative min-h-[100dvh] bg-bg">
      <ThemeStyle
        themePresetKey={org.themePresetKey}
        fontPresetKey={org.fontPresetKey}
        themeOverrides={org.themeOverrides}
      />

      {org.backgroundImageUrl ? (
        <div aria-hidden="true" className="fixed inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={org.backgroundImageUrl} alt="" className="h-full w-full object-cover" />
          {/* Scrim, kept light on purpose: at 80% the photo was all but
              invisible. Readability does not rest on this layer — the
              content sits on frosted panels that blur and tint whatever is
              behind them, so the scrim only has to keep the palette present,
              not hide the picture. */}
          <div className="absolute inset-0 bg-bg/45" />
        </div>
      ) : (
        /* Fixed so the frosted panels below have real colour to blur against. */
        <AmbientBackdrop className="fixed" />
      )}

      <div className="relative mx-auto flex min-h-[100dvh] max-w-[520px] flex-col">
        <OrgHeader org={org} />

        {/* The signature overlap: the panel rides up over the hero and blurs
            it, so the hero visibly passes underneath instead of stopping at
            a seam.

            With a background photo the panel gets much lighter and its blur
            much softer. On a phone it spans the full width, so at the usual
            density the picture was visible in the hero and nowhere else —
            the master had set a background she could not see. Text stays
            legible because the blocks inside (facts, calendar, slot pills)
            carry their own backgrounds. */}
        <div
          className={
            org.backgroundImageUrl
              ? 'glass relative -mt-12 flex-1 rounded-t-[32px] bg-bg-raised/25 px-0 pb-0 pt-1 shadow-hero backdrop-blur-md'
              : 'glass relative -mt-12 flex-1 rounded-t-[32px] bg-bg-raised/50 px-0 pb-0 pt-1 shadow-hero backdrop-blur-3xl'
          }
        >
          <OrgNav
            slug={org.slug}
            showPrices={org.showPricesSection}
            showContacts={org.showContactsSection}
          />
          {children}
        </div>
      </div>
    </div>
  );
}
