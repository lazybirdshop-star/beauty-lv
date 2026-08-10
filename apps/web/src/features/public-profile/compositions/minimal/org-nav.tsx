'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { NavProps } from '../../contracts/sections';

/**
 * Навигация мира Minimal (§6 «Форма»): текстовые вкладки над волосяной
 * линейкой; активная отмечена подчёркиванием 2px чернью (`--nav-active-line`),
 * дорисовывающимся за 160ms на кривой мира (transform, закон А3). Пилюля на
 * утопленном треке — подпись мягкого мира; здесь её нет и не будет.
 *
 * Линейка под рядом — одновременно шов между шапкой и содержимым: панель на
 * шапку не наезжает (`--panel-overlap: 0`), их делят эта линейка и воздух
 * (§6 «Композиция»). Зона нажатия — честные 44px, саму высоту несёт вкладка.
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
    <nav aria-label={t.publicPage.mainNav}>
      <div className="flex gap-5 border-b border-border">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative -mb-px flex min-h-11 items-center px-0.5 text-sm font-medium transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)]',
                isActive ? 'text-ink' : 'text-ink-soft hover:text-ink',
              )}
            >
              {item.label}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-0 bottom-0 h-[var(--nav-active-line)] origin-left bg-accent transition-transform duration-[var(--dur-reveal)] ease-[var(--ease-style)]',
                  isActive ? 'scale-x-100' : 'scale-x-0',
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
