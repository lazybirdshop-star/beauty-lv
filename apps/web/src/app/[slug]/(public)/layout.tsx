import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { OrgHeader } from '@/features/public-profile/components/org-header';
import { OrgNav } from '@/features/public-profile/components/org-nav';
import { getOrganizationBySlug } from '@/features/public-profile/mock-data';

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
    <div className="min-h-[100dvh] bg-bg">
      <OrgHeader org={org} />
      <OrgNav slug={org.slug} />
      {children}
    </div>
  );
}
