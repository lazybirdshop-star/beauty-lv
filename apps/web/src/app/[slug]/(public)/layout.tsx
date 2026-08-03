import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

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
          {/* Scrim over a master's own background photo. Readability does not
              rest on it — every block above carries its own ground — so it
              only has to keep the palette present, not hide the picture. */}
          <div className="absolute inset-0 bg-bg/45" />
        </div>
      ) : null}

      {/*
        One column on a phone, two from `lg`.
        A single wide column still had to scroll: hero, calendar, slots and
        the CTA stack to roughly 950px, more than a desktop viewport. The
        only way to fit without scrolling is to spend the width, so the hero
        moves beside the booking panel and sticks while the right side
        scrolls if it ever needs to.
      */}
      <div className="relative mx-auto flex min-h-[100dvh] max-w-[560px] flex-col lg:max-w-[1180px] lg:flex-row lg:items-stretch lg:gap-0">
        <div className="lg:sticky lg:top-0 lg:h-[100dvh] lg:w-[46%] lg:shrink-0">
          <OrgHeader org={org} />
        </div>

        {/* Flat field with a hard rule where the old build had frosted glass
            riding over the hero. A poster is ink on a surface: blur, rounded
            corners and a lifted shadow are the vocabulary of the template
            this page refuses, and softening the seam is exactly what makes
            every booking page look like the same card. The seam is now
            declared instead of hidden — a 2px vermilion rule. */}
        <div
          className={cn(
            'relative flex-1 border-t-2 border-accent bg-bg px-0 pb-0 pt-0',
            'lg:min-w-0 lg:self-stretch lg:border-l-2 lg:border-t-0',
            org.backgroundImageUrl && 'bg-bg/90',
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
