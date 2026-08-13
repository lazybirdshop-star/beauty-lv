'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { NavProps } from '../../contracts/sections';

import { FOCUS_RING_INSET } from './ui';

/* Перекос — подпись мира: соседние блоки сидят под разными углами, чтобы
   ряд читался набором наклеек, а не сегментированным контролом. Наклон
   декоративен и на порядок чтения не влияет. */
const TILT = ['', '-rotate-[0.8deg]', 'rotate-[0.8deg]'] as const;

/**
 * Навигация мира FUNK (`brutal.html`, `.nav`): три отдельных блока, липнущих
 * к верхней кромке.
 *
 * Активный — чернильный блок с лаймовой надписью и розовой тенью: три
 * краски мира разом, и ни одного скругления. Иконок нет: капс в
 * моноширинном и есть голос этого мира.
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
      className="sticky top-0 z-40 mt-6 flex gap-2 px-[18px] lg:mt-9 lg:px-10"
    >
      {items.map((item, index) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'funk-press flex min-h-11 flex-1 items-center justify-center border-[length:var(--rule-width)] border-solid border-ink px-2 text-center font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] lg:text-xs',
              TILT[index % TILT.length],
              FOCUS_RING_INSET,
              isActive
                ? 'bg-ink text-accent shadow-[3px_3px_0_var(--accent-to,var(--accent))]'
                : 'bg-bg-raised text-ink shadow-[3px_3px_0_var(--ink)] hover:bg-accent',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
