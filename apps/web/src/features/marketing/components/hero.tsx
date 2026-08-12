import Link from 'next/link';
import type { CSSProperties } from 'react';

import type { Messages } from '@/lib/i18n/messages';

import { PageSpecimen } from './page-specimen';

/**
 * Первый экран — тезис, а не шапка.
 *
 * Слева утверждение из двух строк, справа тот самый объект, о котором оно
 * говорит: страница мастера, показанная целиком, а не намёком. Механизм
 * («вы открываете время — его занимают») виден буквально, в занятых и
 * свободных окнах образца, до единого слова описания.
 *
 * Приход — по загрузке и в порядке чтения (`--lp-step`), а не по скроллу:
 * первый экран уже на виду, и ждать от него прокрутки было бы притворством.
 * Ниже по странице действует обратное правило — там всё приходит от `view()`.
 */
export function Hero({ t }: { t: Messages['marketing'] }) {
  return (
    <section className="mx-auto max-w-[1240px] px-6 pb-20 pt-6 md:px-10 md:pb-32 md:pt-10">
      <div className="grid items-center gap-14 md:grid-cols-[1.05fr_0.95fr] md:gap-16 lg:gap-24">
        <div>
          <p className="lp-enter text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--lp-ink-faint)]">
            {t.heroLead}
          </p>

          <h1 className="mt-7 text-[clamp(2.5rem,7.4vw,4.75rem)] font-medium leading-[0.98] tracking-[-0.035em] text-balance">
            <span className="lp-enter-clip">
              <span className="lp-enter-line">{t.heroTitleA}</span>
            </span>
            {/* Вторая строка — акцентом: утверждение делится ровно там, где
                меняется действующее лицо. */}
            <span className="lp-enter-clip">
              <span
                className="lp-enter-line text-[var(--lp-accent)]"
                style={{ '--lp-step': 1 } as CSSProperties}
              >
                {t.heroTitleB}
              </span>
            </span>
          </h1>

          <p
            className="lp-enter lp-measure mt-7 text-[17px] leading-[1.6] text-[var(--lp-ink-soft)] md:text-[18px]"
            style={{ '--lp-step': 3 } as CSSProperties}
          >
            {t.heroBody}
          </p>

          <div
            className="lp-enter mt-10 flex flex-wrap items-center gap-x-8 gap-y-4"
            style={{ '--lp-step': 4 } as CSSProperties}
          >
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
              href="#steps"
              className="inline-flex min-h-11 items-center text-[14px] text-[var(--lp-ink-soft)] underline decoration-[var(--lp-rule)] underline-offset-[6px] transition-colors hover:text-[var(--lp-ink)] hover:decoration-[var(--lp-accent)]"
            >
              {t.heroScroll}
            </Link>
          </div>
        </div>

        <PageSpecimen />
      </div>
    </section>
  );
}
