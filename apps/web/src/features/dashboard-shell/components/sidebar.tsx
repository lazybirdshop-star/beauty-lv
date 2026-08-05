'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { fmt, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { NavBadge } from './nav-badge';

import { navGroupLabels, type NavItem } from '../types';

interface SidebarProps {
  items: NavItem[];
  panelLabel: string;
}

/** Desktop-only (`lg:flex`), full item list — the overflow-into-sheet trick in BottomTabBar exists purely for the narrow viewport. */
export function Sidebar({ items, panelLabel }: SidebarProps) {
  const t = useT();
  const groupLabels = navGroupLabels(t);
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border/60 bg-bg-raised/70 px-4 py-6 backdrop-blur-xl backdrop-saturate-150 lg:flex">
      <div className="px-3 pb-7 font-display text-[22px] leading-tight text-ink">{panelLabel}</div>
      <nav className="flex flex-col gap-1">
        {items.map((item, index) => {
          // A caption whenever the group changes — turns a flat list of nine
          // links into a few short, scannable sections.
          const previousGroup = index > 0 ? items[index - 1]!.group : null;
          const groupLabel = item.group !== previousGroup ? groupLabels[item.group] : '';
          const isActive = pathname === item.href;
          return (
            <div key={item.key} className="contents">
              {groupLabel ? (
                <span className="mt-4 px-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-faint first:mt-0">
                  {groupLabel}
                </span>
              ) : null}
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'press flex items-center gap-3 rounded-full px-4 py-2.5 text-[14px] font-semibold',
                  isActive
                    ? 'bg-accent text-accent-contrast shadow-soft'
                    : 'text-ink-soft hover:bg-bg-sunken hover:text-ink',
                )}
              >
                <item.icon size={20} weight={isActive ? 'fill' : 'regular'} />
                {item.label}
                {/* Pushed to the far edge so the row still reads label-first;
                    on the active row the accent pill would vanish into the
                    accent ground, so it borrows the row's own colours. */}
                <NavBadge
                  count={item.badgeCount ?? 0}
                  label={fmt(t.nav.pendingBadge, { count: item.badgeCount ?? 0 })}
                  className={cn('ml-auto', isActive && 'bg-accent-contrast text-accent')}
                />
              </Link>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
