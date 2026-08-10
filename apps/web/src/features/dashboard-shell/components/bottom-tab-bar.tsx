'use client';

import { DotsThreeCircle } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { fmt, useT } from '@/lib/i18n';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import { NavBadge } from './nav-badge';

import type { NavItem } from '../types';

const PRIMARY_COUNT = 4;

/**
 * Mobile-only (UI_GUIDELINES.md §3.1: max 4-5 items). When there are more
 * than that, the first 4 get a tab each and the rest live behind a "Ещё"
 * tab that opens the same bottom-sheet primitive used elsewhere in the
 * product, rather than cramming 6-8 icons into one bar.
 */
export function BottomTabBar({ items }: { items: NavItem[] }) {
  const t = useT();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = items.slice(0, PRIMARY_COUNT);
  const overflow = items.slice(PRIMARY_COUNT);
  const isOverflowActive = overflow.some((item) => item.href === pathname);

  return (
    <>
      <nav
        aria-label={t.nav.mainNav}
        className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="glass mx-auto flex max-w-[520px] items-stretch gap-0.5 rounded-full p-1.5 shadow-lifted">
          {primary.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                /* 11px is the deliberate floor for tab captions — below the
                   product's 12px body floor but above the 10px they shipped
                   at; «Расписание» must still fit five tabs on a 320px bar. */
                className={cn(
                  'press flex flex-1 flex-col items-center gap-1 rounded-full py-2 text-[11px] font-semibold',
                  isActive ? 'bg-accent-soft text-accent' : 'text-ink-faint',
                )}
              >
                {/* On the icon rather than beside the label: the tab is barely
                    wider than the word, and a pill in that row would push the
                    label off-centre. */}
                <span className="relative">
                  <item.icon size={20} weight={isActive ? 'fill' : 'regular'} />
                  <NavBadge
                    count={item.badgeCount ?? 0}
                    label={fmt(t.nav.pendingBadge, { count: item.badgeCount ?? 0 })}
                    className="absolute -right-3 -top-1.5 ring-2 ring-bg-raised"
                  />
                </span>
                {item.label}
              </Link>
            );
          })}
          {overflow.length > 0 ? (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'press flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-full py-2 text-[11px] font-semibold',
                isOverflowActive ? 'bg-accent-soft text-accent' : 'text-ink-faint',
              )}
            >
              <DotsThreeCircle size={20} weight={isOverflowActive ? 'fill' : 'regular'} />
              {t.nav.more}
            </button>
          ) : null}
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen} title={t.nav.more}>
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
