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
    <nav aria-label="Основная навигация" className="border-b border-border bg-bg px-5 lg:px-10">
      {/* An index, not a segmented control. The pill group was the template's
          own furniture; here the sections are ruled entries and the live one
          is marked by a vermilion underline sitting on the rule itself. */}
      <div className="flex gap-6">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'press relative -mb-px flex min-h-12 items-center border-b-2 text-[13px] font-semibold uppercase tracking-[0.1em] transition-colors',
                isActive
                  ? 'border-accent text-ink'
                  : 'border-transparent text-ink-faint hover:text-ink',
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
