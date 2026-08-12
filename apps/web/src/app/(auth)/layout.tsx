import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { AmolieHorizontal } from '@/features/marketing/components/wordmark';
import '@/features/marketing/marketing.css';
import { I18nProvider } from '@/lib/i18n';
import { LOCALE_COOKIE, resolveMarketingLocale } from '@/lib/i18n/config';
import { getMessages } from '@/lib/i18n/resolve';

/**
 * Порог между лендингом и кабинетом — и одет он в мир лендинга, потому что
 * посетитель приходит сюда именно оттуда. Дальше, с первого экрана кабинета,
 * начинается его собственный мир (UI_GUIDELINES.md).
 *
 * Язык берётся так же, как на лендинге: выбор посетителя из куки, иначе
 * браузер. Мастер, переключившая лендинг на латышский и нажавшая «Войти», не
 * должна встретить форму на другом языке.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = resolveMarketingLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get('accept-language'),
  );
  const t = getMessages(locale).marketing;

  return (
    <I18nProvider locale={locale}>
      <div className="amolie-landing grid min-h-[100dvh] lg:grid-cols-[1fr_minmax(420px,44%)]">
        <div className="flex flex-col">
          <header className="px-6 pt-7 md:px-10 md:pt-8">
            <Link
              href="/"
              aria-label="AMOLIE"
              className="inline-block -m-2 p-2 text-[var(--lp-ink)] transition-opacity hover:opacity-70"
            >
              <AmolieHorizontal className="h-[22px] w-auto" />
            </Link>
          </header>

          <main className="flex flex-1 items-center px-6 py-12 md:px-10">
            <div className="mx-auto w-full max-w-[420px]">{children}</div>
          </main>
        </div>

        {/*
          Тёмная панель — тот же единственный слом земли, что и на лендинге, и
          та же мысль. Скрыта на узких экранах: на телефоне у формы входа один
          хозяин экрана, и это форма.
        */}
        <aside className="hidden bg-[var(--lp-bg-deep)] text-[var(--lp-ink-inverse)] lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="h-px w-10 bg-[var(--lp-accent)]" />
          <p className="max-w-[16ch] text-[clamp(2rem,3vw,2.9rem)] font-medium leading-[1.05] tracking-[-0.03em] text-balance">
            {t.heroTitleA}
            <br />
            <span className="text-[var(--lp-accent)]">{t.heroTitleB}</span>
          </p>
          <p className="max-w-[42ch] text-[14px] leading-[1.6] text-[#a49c92]">{t.heroBody}</p>
        </aside>
      </div>
    </I18nProvider>
  );
}
