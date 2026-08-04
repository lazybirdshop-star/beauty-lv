'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface OrgNavProps {
  slug: string;
  showPrices: boolean;
  showContacts: boolean;
  /** `soft` restores the segmented pill control the poster index replaced. */
  design: string | null;
}

export function OrgNav({ slug, showPrices, showContacts, design }: OrgNavProps) {
  const t = useT();
  const pathname = usePathname();
  const base = `/${slug}`;

  const items = [
    { href: base, label: t.nav.home },
    ...(showPrices ? [{ href: `${base}/prices`, label: t.publicPage.servicesShort }] : []),
    ...(showContacts ? [{ href: `${base}/contacts`, label: t.publicPage.contacts }] : []),
  ];

  return (
    <nav aria-label="Основная навигация" className="border-b border-border bg-bg px-5 lg:px-10">
      {/* An index, not a segmented control. The pill group was the template's
          own furniture; here the sections are ruled entries and the live one
          is marked by a vermilion underline sitting on the rule itself. */}
      <div
        className={cn(design === 'soft' ? 'control flex gap-1 bg-bg-sunken/70 p-1' : 'flex gap-6')}
      >
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'press relative flex min-h-12 items-center transition-colors',
                design === 'soft'
                  ? 'control flex-1 justify-center px-4 text-center text-sm font-semibold'
                  : '-mb-px border-b-2 text-[13px] font-semibold uppercase tracking-[0.1em]',
                design === 'soft'
                  ? isActive
                    ? 'bg-bg-raised text-ink shadow-[var(--surface-shadow)]'
                    : 'text-ink-soft hover:text-ink'
                  : isActive
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
