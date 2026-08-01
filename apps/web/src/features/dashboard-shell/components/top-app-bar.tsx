'use client';

import { SignOut } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ThemeToggle } from '@/components/ui/theme-toggle';

export function TopAppBar({ title }: { title: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-bg/95 px-4 backdrop-blur-md lg:px-8">
      <h1 className="text-[17px] font-semibold text-ink">{title}</h1>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-bg-sunken disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <SignOut size={20} />
          <span className="sr-only">Выйти</span>
        </button>
      </div>
    </header>
  );
}
