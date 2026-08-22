'use client';

import { SignOut } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

import { AmolieLogo } from '@/components/brand/amolie-logo';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useT } from '@/lib/i18n';

export function TopAppBar({ title, hint }: { title: string; hint?: string }) {
  const t = useT();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-bg px-5 py-3 lg:px-10">
      <div className="flex min-w-0 items-center gap-4">
        {/* На телефоне сайдбара нет, и знак платформы живёт здесь — иначе
            кабинет открывается без единого следа бренда. */}
        <Link href="/" aria-label="AMOLIE" className="shrink-0 text-ink lg:hidden">
          <AmolieLogo variant="mark-compact" className="h-6 w-auto" />
        </Link>
        {/* Заголовок плюс строка обычной речью. Мастер приходит со знанием
            своего ремесла, а не словаря этого продукта: «Расписание» и
            «Записи» неразличимы, пока что-то не скажет, где её свободные окна,
            а где чужие просьбы. */}
        <div className="min-w-0">
          <h1 className="truncate font-display text-[22px] leading-none text-ink">{title}</h1>
          {/* Строка обычной речью переносится, а не обрезается. Многоточие в
              конце подсказки — обещание продолжения, которого нет: развернуть
              её негде, и «Окна, в которые к вам можно…» не объясняет ровно
              того, ради чего строка написана. На телефоне она занимает две
              строки, и это дешевле, чем половина предложения. */}
          {hint ? <p className="mt-1.5 text-xs leading-snug text-ink-faint">{hint}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        {/* Asks first: a bare icon in the permanently visible chrome used to
            log out on a single mis-tap — the cheapest of the audit's
            unconfirmed one-tap actions to hit by accident. */}
        <button
          type="button"
          onClick={() => setConfirmingLogout(true)}
          disabled={loggingOut}
          className="action-motion flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink-soft hover:text-ink disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <SignOut size={19} />
          <span className="sr-only">{t.common.logout}</span>
        </button>
      </div>

      <ConfirmSheet
        open={confirmingLogout}
        onOpenChange={setConfirmingLogout}
        title={t.common.logoutTitle}
        description={t.common.logoutText}
        confirmLabel={t.common.logout}
        loading={loggingOut}
        onConfirm={() => void handleLogout()}
      />
    </header>
  );
}
