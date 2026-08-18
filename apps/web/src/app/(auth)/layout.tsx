import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Horizontal } from '@/features/marketing/landing/components/logo';
import '@/features/marketing/landing/styles/index-auth.css';
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
      <div className="amolie-site" lang={locale}>
        <div className="auth">
          {/* Знак и одна строка держат левый край: это не декоративная
              половина, а единственная дорога назад на лендинг. */}
          <aside className="auth__aside">
            <Link href="/" aria-label="AMOLIE" className="auth__brand">
              <Horizontal />
            </Link>

            <p className="auth__pitch">
              {t.heroTitleA}
              <br />
              {t.heroTitleB}
            </p>

            <p className="auth__note">{t.heroBody}</p>
          </aside>

          <main className="auth__main">{children}</main>
        </div>
      </div>
    </I18nProvider>
  );
}
