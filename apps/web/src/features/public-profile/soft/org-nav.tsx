 'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface OrgNavProps {
  slug: string;
  showPrices: boolean;
  showContacts: boolean;
  /** The master's world — the navigation's composition is the style's own. */
  design?: string | null;
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

  /*
   * Minimal (BRAND_STYLES §6): text tabs over a hairline, the active one
   * marked by the world's 2px ink underline (`--nav-active-line`) rather
   * than a raised pill — the pill on a sunken track is the soft world's
   * signature and stays untouched below. The underline draws itself in
   * 160ms on the world's curve (transform, law А3); a true slide between
   * tabs needs layout measurement and is a later refinement.
   */
  if (design === 'minimal') {
    return (
      <nav aria-label={t.publicPage.mainNav} className="px-5 pt-5 lg:px-7 lg:pt-6">
        <div className="flex gap-5 border-b border-border">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  /* 44px tall honestly — the whole tab is the hit target, no
                     pseudo-element padding the reach after the fact. */
                  'press relative -mb-px flex min-h-11 items-center px-0.5 text-sm font-medium transition-colors duration-[var(--dur-hover)]',
                  isActive ? 'bg-[var(--nav-active-bg)] text-ink' : 'text-ink-soft hover:text-ink',
                )}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-0 bottom-0 h-[var(--nav-active-line)] origin-left bg-accent transition-transform duration-150 ease-[var(--ease-style)]',
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

  /*
   * Luxury (BRAND_STYLES §7, по референсу мастера): caps links on the
   * editorial left axis — the ceremony reads in the letterspacing
   * (`--action-tracking`, 0.16em). The active item is marked by the
   * world's 1px gold rule (`--nav-active-line`) which draws itself over
   * 300ms on the curtain curve (transform, law А3); the row rests between
   * the panel's champagne seam above and its own quiet hairline below.
   * 44px tall honestly, as everywhere.
   */
  if (design === 'luxury') {
    return (
      <nav aria-label={t.publicPage.mainNav} className="px-5 pt-5 lg:px-7 lg:pt-6">
        <div className="flex justify-start gap-8 border-b border-border">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'luxury-action relative -mb-px flex min-h-11 items-center text-[12px] font-semibold uppercase tracking-[var(--action-tracking)]',
                  isActive ? 'text-ink' : 'text-ink-soft hover:text-ink',
                )}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-0 bottom-0 h-[var(--nav-active-line)] origin-left bg-accent transition-transform duration-300 ease-[var(--ease-style)]',
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

  return (
    <nav aria-label={t.publicPage.mainNav} className="px-5 pb-1 pt-5 lg:px-7 lg:pt-6">
      <div className="flex gap-1 rounded-full bg-bg-sunken/70 p-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                // 40px tall by design; the pseudo-element adds the missing 4px of
                // touch target without changing the bar's height.
                "press relative flex-1 rounded-full px-4 py-2.5 text-center text-sm font-semibold after:absolute after:-inset-y-0.5 after:inset-x-0 after:content-['']",
                /* The active mark reads the world's tokens: a raised pill by
                   default (`--nav-active-bg` is the raised surface there). */
                isActive
                  ? 'bg-[var(--nav-active-bg)] text-ink shadow-soft'
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
