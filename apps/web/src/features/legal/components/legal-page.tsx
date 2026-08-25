/**
 * Страница юридического текста.
 *
 * Живёт в мире лендинга — та же обёртка `.amolie-site`, те же токены, тот же
 * подвал. Это не экономия, а требование: политика конфиденциальности на чужой
 * вёрстке читается как чужая страница, а посетитель, ушедший по ссылке из
 * подвала, обязан остаться на том же сайте.
 *
 * От лендинга страница отличается ровно тем, чем должна отличаться читаемая
 * бумага: узкая мера, спокойная типографика, никакой хореографии по скроллу.
 */
import { LocaleSwitch } from '@/features/marketing/landing/components/locale-switch';
import { Wordmark } from '@/features/marketing/landing/components/logo';
import { Footer } from '@/features/marketing/landing/sections/footer';
import type { Locale } from '@/lib/i18n/config';
import { fmt, type Messages } from '@/lib/i18n/messages';
import Link from 'next/link';

import { COMPANY, LEGAL_REVISION } from '../company';
import { LEGAL_SLUGS, type LegalDocument, type LegalSlug } from '../model';
import { Block } from './legal-blocks';

/** Заголовки соседних документов — из словаря, а не из самих документов:
    ради одной строки не стоит собирать чужой текст целиком. */
const TITLE_KEY: Record<LegalSlug, keyof Messages['legal']> = {
  privacy: 'documentPrivacy',
  terms: 'documentTerms',
  cookies: 'documentCookies',
};

export function LegalPage({
  document: doc,
  t,
  locale,
}: {
  document: LegalDocument;
  t: Messages;
  locale: Locale;
}) {
  const others = LEGAL_SLUGS.filter((slug) => slug !== doc.slug);
  const path = `/${doc.slug}`;

  return (
    <div className="amolie-site legal" lang={locale}>
      <a className="skip-link" href="#document">
        {t.marketing.skipToContent}
      </a>

      <header className="legal__bar">
        <Link className="legal__brand" href="/" aria-label={t.legal.backHome}>
          <Wordmark className="legal__mark" />
        </Link>

        <LocaleSwitch
          active={locale}
          className="legal__lang"
          label={t.marketing.language}
          path={path}
        />
      </header>

      <main className="shell legal__shell">
        <div className="legal__head">
          <h1 className="legal__title">{doc.title}</h1>
          <p className="legal__summary">{doc.summary}</p>
          <p className="legal__revision muted">
            <time dateTime={LEGAL_REVISION}>{fmt(t.legal.updated, { date: LEGAL_REVISION })}</time>
          </p>
        </div>

        <div className="legal__body">
          {/* Оглавление стоит перед текстом, а не сбоку: на телефоне боковой
              колонки нет, и «прилипающее» оглавление на узком экране всегда
              оказывается либо поверх текста, либо за его пределами. */}
          <nav className="legal__toc" aria-label={t.legal.contents}>
            <h2 className="legal__toc-title">{t.legal.contents}</h2>
            <ol className="legal__toc-list">
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="legal__doc" id="document">
            {doc.sections.map((section) => (
              <section key={section.id} id={section.id} className="legal__section">
                <h2 className="legal__section-title">{section.title}</h2>
                {section.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </section>
            ))}

            <aside className="legal__aside">
              <h2 className="legal__aside-title">{t.legal.questions}</h2>
              <p className="legal__text">
                {fmt(t.legal.questionsBody, { email: COMPANY.email.privacy })}
              </p>
              <a className="btn btn--solid" href={`mailto:${COMPANY.email.privacy}`}>
                {COMPANY.email.privacy}
              </a>
            </aside>

            <nav className="legal__related" aria-label={t.legal.otherDocuments}>
              <h2 className="legal__toc-title">{t.legal.otherDocuments}</h2>
              <ul className="legal__related-list">
                {others.map((slug) => (
                  <li key={slug}>
                    <Link href={`/${slug}`}>{t.legal[TITLE_KEY[slug]]}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </article>
        </div>
      </main>

      <Footer t={t.marketing} />
    </div>
  );
}
