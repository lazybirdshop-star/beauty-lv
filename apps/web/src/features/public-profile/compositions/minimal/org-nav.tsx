'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { NavProps } from '../../contracts/sections';

import { FOCUS_RING_INSET } from './ui';

/**
 * Навигация мира MINIMAL (`minimal.html`, `.nav`): сегментированный контрол
 * в матовой капсуле, липнущий к верхней кромке.
 *
 * Активный пункт — белая капсула с короткой тенью и волоском по краю: тот
 * же приём, которым системные контролы отделяют выбранное от фона. Иконок
 * нет: мир говорит только текстом.
 *
 * Колонки равной ширины, а не по содержимому: сегментированный контрол —
 * это шкала, и её деления не должны прыгать при смене языка.
 */
export function OrgNav({ org }: NavProps) {
  const t = useT();
  const pathname = usePathname();
  const base = `/${org.slug}`;

  const items = [
    { key: 'home', href: base, label: t.nav.home },
    ...(org.showPricesSection
      ? [{ key: 'prices', href: `${base}/prices`, label: t.publicPage.servicesShort }]
      : []),
    ...(org.showContactsSection
      ? [{ key: 'contacts', href: `${base}/contacts`, label: t.publicPage.contacts }]
      : []),
  ];

  return (
    <nav
      aria-label={t.publicPage.mainNav}
      className="sticky top-2.5 z-40 mx-[22px] mt-6 lg:mx-auto lg:mt-7 lg:w-full lg:max-w-[600px]"
    >
      <div
        className="min-frost grid rounded-full p-1 shadow-[inset_0_0_0_1px_var(--border),0_10px_30px_-14px_rgb(0_0_0/0.12)]"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'min-press flex min-h-11 items-center justify-center rounded-full px-2 text-center text-[13.5px] font-semibold tracking-[-0.02em]',
                FOCUS_RING_INSET,
                isActive
                  ? 'bg-[var(--nav-active-bg)] text-ink shadow-[0_3px_10px_rgb(0_0_0/0.1),0_0_0_1px_var(--border)]'
                  : 'text-ink-soft hover:text-ink',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
