'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { NavProps } from '../../contracts/sections';
import { cascade, FOCUS_RING_INSET } from './ui';

/**
 * Навигация мира AURA (`aura.html`, `.nav`): липкая стеклянная капсула на
 * всю ширину, внутри — три равные доли.
 *
 * Активный пункт отмечен белой пилюлей с мягкой тенью (`--nav-active-bg`),
 * остальные — приглушённым текстом. Иконок в этом мире нет вовсе: подписи
 * короткие, а глиф рядом с ними был бы вторым носителем одного смысла.
 *
 * Капсула липнет в 12px от верха, как в файле, и переживает клиентские
 * переходы внутри сегмента — она живёт в `Shell`, а не в странице.
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
      style={cascade(1)}
      /* Доли делит `flex-1`, а не сетка из трёх колонок: мастер, скрывшая
         прайс, получила бы пустую треть капсулы. */
      className="anim-aura-rise aura-veil sticky top-3 z-40 mt-[26px] rounded-full p-[5px] lg:mx-auto lg:mt-8 lg:w-full lg:max-w-[620px]"
    >
      <div className="flex">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'aura-action flex min-h-11 flex-1 items-center justify-center rounded-full px-2 text-center text-[12.5px] font-medium',
                FOCUS_RING_INSET,
                isActive
                  ? 'bg-[var(--nav-active-bg)] text-ink shadow-[0_8px_20px_-8px_color-mix(in_srgb,var(--ink)_25%,transparent)]'
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
