import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { AmbientBackdrop } from '@/components/ui/ambient-backdrop';
import { cn } from '@/lib/utils';
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

      {/*
        One column on a phone, two from `lg`.
        A single wide column still had to scroll: hero, calendar, slots and
        the CTA stack to roughly 950px, more than a desktop viewport. The
        only way to fit without scrolling is to spend the width, so the hero
        moves beside the booking panel and sticks while the right side
        scrolls if it ever needs to.
      */}
      <div className="relative mx-auto flex min-h-[100dvh] max-w-[520px] flex-col lg:max-w-6xl lg:flex-row lg:items-start lg:gap-8 lg:px-8 lg:py-10">
        <div className="lg:sticky lg:top-10 lg:w-[340px] lg:shrink-0 xl:w-[380px]">
          <OrgHeader org={org} />
        </div>

        {/* The signature overlap: the panel rides up over the hero and blurs
            it, so the hero visibly passes underneath instead of stopping at
            a seam.

            With a background photo the panel gets much lighter and its blur
            much softer. On a phone it spans the full width, so at the usual
            density the picture was visible in the hero and nowhere else —
            the master had set a background she could not see. Text stays
            legible because the blocks inside (facts, calendar, slot pills)
            carry their own backgrounds. */}
        {/* The overlap is a phone-layout device — side by side there is no
            seam to hide, so from `lg` the panel becomes a plain card. */}
        <div
          className={cn(
            'glass relative -mt-12 flex-1 rounded-t-[32px] px-0 pb-0 pt-1 shadow-hero',
            'lg:mt-0 lg:min-w-0 lg:self-stretch lg:rounded-[32px]',
            org.backgroundImageUrl
              ? 'bg-bg-raised/25 backdrop-blur-md'
              : 'bg-bg-raised/50 backdrop-blur-3xl',
          )}
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
