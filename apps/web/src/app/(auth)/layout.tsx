import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import { Horizontal } from '@/features/marketing/landing/components/logo';
import { Still } from '@/features/marketing/landing/components/still';
import '@/features/marketing/landing/styles/index-auth.css';
import { I18nProvider } from '@/lib/i18n';
import { LOCALE_COOKIE, resolveMarketingLocale } from '@/lib/i18n/config';
import { getMessages } from '@/lib/i18n/resolve';

/**
 * Порог между лендингом и кабинетом — и одет он в мир лендинга, потому что
 * посетитель приходит сюда именно оттуда. Дальше, с первого экрана кабинета,
 * начинается его собственный мир (UI_GUIDELINES.md).
 *
 * Две половины: слева форма, справа снимок салона с одной строкой поверх.
 * Правая половина исчезает ниже 900px — на телефоне она отняла бы у формы
 * половину экрана и не сказала бы ничего, чего форма не говорит сама.
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
  const messages = getMessages(locale);
  const t = messages.marketing;
  const year = new Date().getFullYear();

  return (
    <I18nProvider locale={locale}>
      <div className="auth" lang={locale}>
        <section className="auth__panel">
          <div className="auth__top">
            <Link href="/" className="auth__logo" aria-label={t.navBackToTop}>
              <Horizontal />
            </Link>
            <Link href="/" className="auth__back">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 3L5 8l5 5" />
              </svg>
              {t.authBackHome}
            </Link>
          </div>

          <div className="auth__body">{children}</div>

          <div className="auth__foot">
            <span>© {year} AMOLIE</span>
            <Link href="/privacy">{t.footerLinkPrivacy}</Link>
            <Link href="/terms">{t.footerLinkTerms}</Link>
          </div>
        </section>

        {/* Снимок и одна строка. Читалке здесь нечего сказать — весь смысл
            половины в том, что она показывает, а не в том, что называет. */}
        <aside
          className="auth__visual"
          aria-hidden="true"
          style={{ '--pos': '60% 50%' } as CSSProperties}
        >
          <Still src="/landing/cover-salon.jpg" sizes="(max-width: 900px) 0px, 50vw" />
          <div className="auth__caption">
            <p className="eyebrow">{t.heroEyebrow}</p>
            <p>{t.authVisualSignIn}</p>
          </div>
        </aside>
      </div>
    </I18nProvider>
  );
}
