'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AmolieLogo } from '@/components/brand/amolie-logo';
import { fmt, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { NavBadge } from './nav-badge';

import { navGroupLabels, type NavItem } from '../types';

interface SidebarProps {
  items: NavItem[];
  panelLabel: string;
}

/**
 * Только для широкого экрана (`lg:flex`) — переполнение в шторку у
 * `BottomTabBar` существует ровно ради узкого.
 *
 * Активный раздел отмечен так же, как занятое время в расписании: полосой
 * акцента 3px у края и ступенью поверхности. Пилюли здесь нет — в системе она
 * принадлежит кнопкам и слотам времени, а не навигации.
 */
export function Sidebar({ items, panelLabel }: SidebarProps) {
  const t = useT();
  const groupLabels = navGroupLabels(t);
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border bg-bg py-7 lg:flex">
      {/* Знак платформы стоит над именем кабинета: логотип рисуется
          `currentColor`, поэтому наследует чернила темы и работает на обеих. */}
      <div className="flex flex-col gap-4 px-6 pb-6">
        <Link href="/" className="text-ink" aria-label="AMOLIE">
          <AmolieLogo variant="wordmark" className="h-[15px] w-auto" />
        </Link>
        <span className="truncate text-[13px] text-ink-faint">{panelLabel}</span>
      </div>

      <nav className="flex flex-col overflow-y-auto border-t border-border pt-2">
        {items.map((item, index) => {
          // A caption whenever the group changes — turns a flat list of nine
          // links into a few short, scannable sections.
          const previousGroup = index > 0 ? items[index - 1]!.group : null;
          const groupLabel = item.group !== previousGroup ? groupLabels[item.group] : '';
          const isActive = pathname === item.href;
          return (
            <div key={item.key} className="contents">
              {groupLabel ? (
                <span className="mt-6 px-6 pb-2 text-[11px] uppercase tracking-[0.2em] text-ink-faint first:mt-2">
                  {groupLabel}
                </span>
              ) : null}
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'action-motion relative flex min-h-11 items-center gap-3 py-2.5 pl-6 pr-4 text-[14px]',
                  isActive ? 'bg-bg-raised text-ink' : 'text-ink-soft hover:text-ink',
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
                <NavBadge
                  count={item.badgeCount ?? 0}
                  label={fmt(t.nav.pendingBadge, { count: item.badgeCount ?? 0 })}
                  className="ml-auto"
                />
              </Link>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
