'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { ADMIN_NAV_ITEMS, getMasterNavItems } from '../nav-config';
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
  const navItems = nav.role === 'admin' ? ADMIN_NAV_ITEMS : getMasterNavItems(nav.slug);
  const pathname = usePathname();
  const title = resolveTitle(navItems, pathname, panelLabel);

  return (
    <div className="min-h-dvh bg-bg">
      <Sidebar items={navItems} panelLabel={panelLabel} />
      <div className="lg:pl-64">
        <TopAppBar title={title} />
        <main className="px-4 pb-24 pt-6 lg:px-8 lg:pb-10">{children}</main>
      </div>
      <BottomTabBar items={navItems} />
    </div>
  );
}
