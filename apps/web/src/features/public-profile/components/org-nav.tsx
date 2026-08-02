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
    <nav aria-label="Основная навигация" className="px-5 pb-1 pt-5 lg:px-7 lg:pt-6">
      <div className="flex gap-1 rounded-full bg-bg-sunken/70 p-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'press flex-1 rounded-full px-4 py-2.5 text-center text-sm font-semibold',
                isActive ? 'bg-bg-raised text-ink shadow-soft' : 'text-ink-soft hover:text-ink',
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
