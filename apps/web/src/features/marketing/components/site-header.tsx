import Link from 'next/link';

import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/messages';

import { LanguageSwitcher } from './language-switcher';
import { AmolieHorizontal } from './wordmark';

/**
 * Шапка лендинга: знак, язык, вход.
 *
 * Не липкая. Прилипшая полоса съедает верх первого экрана на телефоне и
 * навязывает себя всю дорогу; здесь у страницы один вход, и он повторяется
 * внизу, где решение и принимается.
 */
export function SiteHeader({ t, locale }: { t: Messages['marketing']; locale: Locale }) {
  return (
    <header className="relative z-10">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-6 md:px-10 md:py-8">
        <Link
          href="/"
          className="-m-2 p-2 text-[var(--lp-ink)] transition-opacity hover:opacity-70"
          aria-label="AMOLIE"
        >
          <AmolieHorizontal className="h-[22px] w-auto md:h-6" />
        </Link>

        <div className="flex items-center gap-2 md:gap-5">
          <LanguageSwitcher active={locale} />
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center text-[13px] font-medium tracking-[0.02em] text-[var(--lp-ink-soft)] transition-colors hover:text-[var(--lp-ink)]"
          >
            {t.logIn}
          </Link>
        </div>
      </div>
    </header>
  );
}
