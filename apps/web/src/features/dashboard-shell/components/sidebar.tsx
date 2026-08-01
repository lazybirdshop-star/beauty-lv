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
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-border bg-bg-raised px-4 py-6 lg:flex">
      <div className="px-3 pb-6 text-lg font-semibold tracking-tight text-ink">{panelLabel}</div>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors',
                isActive
                  ? 'bg-accent-soft text-accent'
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
