'use client';

import { DotsThreeCircle } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import type { NavItem } from '../types';

const PRIMARY_COUNT = 4;

/**
 * Mobile-only (UI_GUIDELINES.md §3.1: max 4-5 items). When there are more
 * than that, the first 4 get a tab each and the rest live behind a "Ещё"
 * tab that opens the same bottom-sheet primitive used elsewhere in the
 * product, rather than cramming 6-8 icons into one bar.
 */
export function BottomTabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = items.slice(0, PRIMARY_COUNT);
  const overflow = items.slice(PRIMARY_COUNT);
  const isOverflowActive = overflow.some((item) => item.href === pathname);

  return (
    <>
      <nav
        aria-label="Основная навигация"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-bg-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        {primary.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold',
                isActive ? 'text-accent' : 'text-ink-faint',
              )}
            >
              <item.icon size={22} weight={isActive ? 'fill' : 'regular'} />
              {item.label}
            </Link>
          );
        })}
        {overflow.length > 0 ? (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold',
              isOverflowActive ? 'text-accent' : 'text-ink-faint',
            )}
          >
            <DotsThreeCircle size={22} weight={isOverflowActive ? 'fill' : 'regular'} />
            Ещё
          </button>
        ) : null}
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen} title="Ещё">
        <div className="flex flex-col gap-1">
          {overflow.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold',
                pathname === item.href ? 'bg-accent-soft text-accent' : 'text-ink',
              )}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </div>
      </Sheet>
    </>
  );
}
