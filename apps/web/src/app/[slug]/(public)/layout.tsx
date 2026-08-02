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

      {/* Fixed so the frosted panels below have real colour to blur against. */}
      <AmbientBackdrop className="fixed" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-[520px] flex-col">
        <OrgHeader org={org} />

        {/* The signature overlap: content panel rides up over the hero. */}
        <div className="glass relative -mt-6 flex-1 rounded-t-[32px] px-0 pb-0 pt-1 shadow-hero">
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
