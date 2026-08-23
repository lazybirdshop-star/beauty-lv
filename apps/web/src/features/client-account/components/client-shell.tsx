'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { AmolieLogo } from '@/components/brand/amolie-logo';
import { useT } from '@/lib/i18n';

/**
 * Оболочка кабинета клиента.
 *
 * Метку поверхности ставит именно она: законы мира AMOLIE в `globals.css`
 * висят на `[data-surface]`, и режим, забывший её поставить, получил бы
 * умолчания `:root` — то есть чужой мир. На этом уже обожглась Студия.
 *
 * Навигации здесь нет и не должно быть: у клиента один экран. Таб-бар на
 * шесть разделов — инструмент мастера, которая работает здесь каждый день.
 */
export function ClientShell({ children, signedIn }: { children: ReactNode; signedIn: boolean }) {
  const t = useT();
  const router = useRouter();

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.refresh();
  }

  return (
    <div data-surface="client" className="min-h-dvh bg-bg">
      <header className="flex items-center justify-between gap-4 px-5 py-5 lg:px-8">
        <AmolieLogo className="h-5 w-auto text-ink" title="AMOLIE" />
        {signedIn ? (
          <button
            type="button"
            onClick={() => void signOut()}
            className="press min-h-11 cursor-pointer px-2 text-sm text-ink-soft"
          >
            {t.clientAccount.signOut}
          </button>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-2xl px-5 pb-20 pt-2 lg:px-8">{children}</main>
    </div>
  );
}
