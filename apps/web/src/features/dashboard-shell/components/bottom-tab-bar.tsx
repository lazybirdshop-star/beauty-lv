'use client';

import { DotsThreeCircle } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Sheet } from '@/components/ui/sheet';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

import { NavBadge } from './nav-badge';

import type { NavItem } from '../types';

const PRIMARY_COUNT = 4;

/**
 * Только для телефона (UI_GUIDELINES.md §3.1: не больше 4–5 пунктов). Когда
 * разделов больше, первые четыре получают по вкладке, остальные уходят в
 * «Ещё» — ту же шторку, что и везде в продукте.
 *
 * Панель стоит на своей поверхности волосяной линией вверх, а не парит стеклом:
 * матовых стеклянных панелей в системе нет. Активная вкладка отмечена полосой
 * акцента 2px по верхнему краю — той же меткой, которой отмечено занятое
 * время; пилюли под подписью здесь нет.
 */
export function BottomTabBar({ items }: { items: NavItem[] }) {
  const t = useT();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = items.slice(0, PRIMARY_COUNT);
  const overflow = items.slice(PRIMARY_COUNT);
  const isOverflowActive = overflow.some((item) => item.href === pathname);

  const tabClass = (isActive: boolean) =>
    cn(
      'action-motion relative flex flex-1 flex-col items-center gap-1.5 pb-2 pt-3 text-[11px]',
      isActive ? 'text-ink' : 'text-ink-faint',
    );

  return (
    <>
      <nav
        aria-label={t.nav.mainNav}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="mx-auto flex max-w-[560px] items-stretch">
          {primary.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                /* 11px — сознательный пол для подписи вкладки: ниже 12px
                   продукта, но выше прежних 10px, и «Расписание» всё ещё
                   помещается пятью вкладками на 320px. */
                className={tabClass(isActive)}
              >
                {isActive ? (
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-accent" />
                ) : null}
                {/* Счётчик на иконке, а не рядом с подписью: вкладка едва шире
                    слова, и метка в той строке сдвинула бы подпись с центра. */}
                <span className="relative">
                  <item.icon size={21} weight="regular" />
                  <NavBadge
                    count={item.badgeCount ?? 0}
                    label={fmt(t.nav.pendingBadge, { count: item.badgeCount ?? 0 })}
                    className="absolute -right-3 -top-1.5 ring-2 ring-bg"
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
              className={cn(tabClass(isOverflowActive), 'cursor-pointer')}
            >
              {isOverflowActive ? (
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-accent" />
              ) : null}
              <DotsThreeCircle size={21} weight="regular" />
              {t.nav.more}
            </button>
          ) : null}
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen} title={t.nav.more}>
        <div className="flex flex-col">
          {overflow.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'action-motion relative flex min-h-12 items-center gap-3 py-3 pl-4 pr-3 text-[15px]',
                  isActive ? 'bg-bg-sunken text-ink' : 'text-ink-soft',
                )}
              >
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-[3px] bg-accent"
                  />
                ) : null}
                <item.icon size={19} weight="regular" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
