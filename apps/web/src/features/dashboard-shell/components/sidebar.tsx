'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

import type { NavItem } from '../types';

interface SidebarProps {
  items: NavItem[];
  panelLabel: string;
}

/** Desktop-only (`lg:flex`), full item list — the overflow-into-sheet trick in BottomTabBar exists purely for the narrow viewport. */
export function Sidebar({ items, panelLabel }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border/60 bg-bg-raised/70 px-4 py-6 backdrop-blur-xl backdrop-saturate-150 lg:flex">
      <div className="px-3 pb-7 font-display text-[22px] leading-tight text-ink">{panelLabel}</div>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.key}
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
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
