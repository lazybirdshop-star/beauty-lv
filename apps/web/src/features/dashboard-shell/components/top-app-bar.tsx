'use client';

import { SignOut } from '@phosphor-icons/react';
import { useT } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ThemeToggle } from '@/components/ui/theme-toggle';

export function TopAppBar({ title, hint }: { title: string; hint?: string }) {
  const t = useT();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-border/60 bg-bg/70 px-4 py-2.5 backdrop-blur-xl backdrop-saturate-150 lg:px-8">
      {/* Title plus one line of plain speech. A master arrives knowing her
          trade, not this product's vocabulary — «Расписание» and «Записи» are
          indistinguishable until something says which holds her free windows
          and which holds other people's requests. */}
      <div className="min-w-0">
        <h1 className="truncate font-display text-[22px] leading-none text-ink">{title}</h1>
        {hint ? <p className="mt-1 truncate text-xs text-ink-soft">{hint}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="press flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink-soft hover:bg-bg-sunken disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <SignOut size={20} />
          <span className="sr-only">{t.common.logout}</span>
        </button>
      </div>
    </header>
  );
}
