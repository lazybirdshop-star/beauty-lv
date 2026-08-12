import Link from 'next/link';

import type { Messages } from '@/lib/i18n/messages';

import { AmolieMark } from './wordmark';

/**
 * Закрытие страницы.
 *
 * Закрытый набор назван прямо и не превращён в дефицит-приманку: продукт
 * действительно подключает мастеров вручную, и честная формулировка держит
 * это фактом, а не давлением. Второе действие — вход, потому что мастер,
 * которой уже выдали код, приходит сюда именно за ним.
 */
export function Closing({ t }: { t: Messages['marketing'] }) {
  return (
    <section className="mx-auto max-w-[1240px] px-6 py-24 md:px-10 md:py-36">
      <div className="lp-rise mx-auto max-w-[680px] text-center">
        <AmolieMark className="mx-auto h-9 w-auto text-[var(--lp-accent)]" />

        <h2 className="mt-9 text-[clamp(1.9rem,5vw,3.1rem)] font-medium leading-[1.05] tracking-[-0.03em] text-balance">
          {t.closingTitle}
        </h2>

        <p className="mx-auto mt-6 max-w-[46ch] text-[16px] leading-[1.65] text-[var(--lp-ink-soft)] md:text-[17px]">
          {t.closingBody}
        </p>

        <div className="mt-11 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <Link
            href="/register"
            className="lp-action group inline-flex min-h-[52px] items-center gap-3 bg-[var(--lp-ink)] px-7 text-[14px] font-medium tracking-[0.02em] text-[var(--lp-ink-inverse)]"
          >
            {t.haveCode}
            <span
              aria-hidden="true"
              className="transition-transform duration-300 ease-[var(--lp-ease)] group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center text-[14px] text-[var(--lp-ink-soft)] underline decoration-[var(--lp-rule)] underline-offset-[6px] transition-colors hover:text-[var(--lp-ink)] hover:decoration-[var(--lp-accent)]"
          >
            {t.logIn}
          </Link>
        </div>
      </div>
    </section>
  );
}
