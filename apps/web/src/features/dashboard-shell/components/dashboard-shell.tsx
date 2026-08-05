'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { AmbientBackdrop } from '@/components/ui/ambient-backdrop';

import { useT } from '@/lib/i18n';

import { usePendingBookingsCount } from '@/features/bookings/use-pending-count';

import { getAdminNavItems, getMasterNavItems } from '../nav-config';
import type { NavItem } from '../types';
import { BottomTabBar } from './bottom-tab-bar';
import { Sidebar } from './sidebar';
import { TopAppBar } from './top-app-bar';

type DashboardNav = { role: 'admin' } | { role: 'master'; slug: string };

interface DashboardShellProps {
  nav: DashboardNav;
  panelLabel: string;
  children: ReactNode;
}

function resolveTitle(navItems: NavItem[], pathname: string, fallback: string): string {
  const exact = navItems.find((item) => item.href === pathname);
  if (exact) return exact.label;
  const prefixMatch = navItems.find((item) => item.href !== '/' && pathname.startsWith(item.href));
  return prefixMatch?.label ?? fallback;
}

/**
 * The one shell both `/admin` and `/[slug]/dashboard` mount — only `nav`/
 * `panelLabel` differ. Nav items (which carry Phosphor icon component
 * references) are resolved here, inside the client boundary, rather than
 * passed in as a prop from the Server Component layouts — React Server
 * Components can't serialize component references across that boundary.
 */
export function DashboardShell({ nav, panelLabel, children }: DashboardShellProps) {
  const t = useT();

  /* Bookings a client has made but the master has not answered yet. The hook
     runs for the admin panel too — with a null slug it is disabled and returns
     0 — because hooks cannot be called conditionally. */
  const pendingBookings = usePendingBookingsCount(nav.role === 'master' ? nav.slug : null);

  const navItems = (
    nav.role === 'admin' ? getAdminNavItems(t) : getMasterNavItems(nav.slug, t)
  ).map((item) => (item.key === 'bookings' ? { ...item, badgeCount: pendingBookings } : item));

  const pathname = usePathname();
  const title = resolveTitle(navItems, pathname, panelLabel);

  return (
    <div className="relative min-h-dvh bg-bg">
      {/* Fixed, so the glass chrome has real colour to blur against. */}
      <AmbientBackdrop className="fixed" />
      <Sidebar items={navItems} panelLabel={panelLabel} />
      <div className="relative lg:pl-64">
        <TopAppBar title={title} />
        <main className="mx-auto max-w-5xl px-4 pb-32 pt-6 lg:px-8 lg:pb-12">{children}</main>
      </div>
      <BottomTabBar items={navItems} />
    </div>
  );
}
