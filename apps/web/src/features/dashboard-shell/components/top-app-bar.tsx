'use client';

import { SignOut } from '@phosphor-icons/react';
import { useT } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ThemeToggle } from '@/components/ui/theme-toggle';

export function TopAppBar({ title }: { title: string }) {
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-bg/70 px-4 backdrop-blur-xl backdrop-saturate-150 lg:px-8">
      <h1 className="font-display text-[22px] leading-none text-ink">{title}</h1>
      <div className="flex items-center gap-1">
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
