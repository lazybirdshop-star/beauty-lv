'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

interface OrgNavProps {
  slug: string;
  showPrices: boolean;
  showContacts: boolean;
}

export function OrgNav({ slug, showPrices, showContacts }: OrgNavProps) {
  const pathname = usePathname();
  const base = `/${slug}`;

  const items = [
    { href: base, label: 'Главная' },
    ...(showPrices ? [{ href: `${base}/prices`, label: 'Цены' }] : []),
    ...(showContacts ? [{ href: `${base}/contacts`, label: 'Контакты' }] : []),
  ];

  return (
    <nav aria-label="Основная навигация" className="flex gap-1 overflow-x-auto px-5 py-3">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              isActive ? 'bg-accent text-accent-contrast' : 'text-ink-soft hover:bg-bg-sunken',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
