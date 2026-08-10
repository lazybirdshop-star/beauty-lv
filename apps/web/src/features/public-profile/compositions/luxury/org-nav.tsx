'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { NavProps } from '../../contracts/sections';

/**
 * Навигация мира Luxury («Bergs»): полоса равных табов во всю ширину листа.
 * Каждый пункт — ячейка с чернильными швами-разделителями; капс 11px с
 * разрядкой `--action-tracking`. Активный таб залит чернью
 * (`--nav-active-bg`) со сливочной надписью — печатный негатив, а не
 * подчёркивание. Смена заливки — 300ms кривой-шторы (несёт `luxury-action`).
 * Зона нажатия честная: высоту 44px+ несёт сама ссылка.
 */
export function OrgNav({ org }: NavProps) {
  const t = useT();
  const pathname = usePathname();
  const base = `/${org.slug}`;

  const items = [
    { href: base, label: t.nav.home },
    ...(org.showPricesSection
      ? [{ href: `${base}/prices`, label: t.publicPage.servicesShort }]
      : []),
    ...(org.showContactsSection
      ? [{ href: `${base}/contacts`, label: t.publicPage.contacts }]
      : []),
  ];

  return (
    <nav aria-label={t.publicPage.mainNav} className="border-b border-border-strong">
      <div className="flex divide-x divide-border-strong">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'luxury-action flex min-h-12 flex-1 items-center justify-center text-[11px] font-medium uppercase tracking-[var(--action-tracking)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                isActive
                  ? 'bg-[var(--nav-active-bg)] text-bg-raised'
                  : 'text-ink-faint hover:text-ink',
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
