/**
 * Подвал юридической страницы.
 *
 * Свой, а не подвал лендинга. Раньше документы забирали его целиком, и вместе
 * с ним — колонку «Продукт» со ссылками вида `#pricing`: на `/privacy` таких
 * якорей нет, и половина подвала вела в никуда. Здесь остаётся только то,
 * что на странице документа имеет смысл: сами документы, три ящика и строка
 * о роли обработчика.
 */
import type { Messages } from '@/lib/i18n/messages';
import { fmt } from '@/lib/i18n/messages';
import Link from 'next/link';

import { COMPANY } from '../company';
import { LEGAL_SLUGS, type LegalSlug } from '../model';

const TITLE_KEY: Record<LegalSlug, keyof Messages['legal']> = {
  privacy: 'documentPrivacy',
  terms: 'documentTerms',
  cookies: 'documentCookies',
};

export function LegalFooter({ t }: { t: Messages }) {
  const year = new Date().getFullYear();

  return (
    <footer className="legal__footer">
      <div className="shell legal__footer-grid">
        <nav className="legal__footer-col" aria-label={t.marketing.footerColLegal}>
          <p className="legal__footer-title">{t.marketing.footerColLegal}</p>
          <ul>
            {LEGAL_SLUGS.map((slug) => (
              <li key={slug}>
                <Link href={`/${slug}`}>{t.legal[TITLE_KEY[slug]]}</Link>
              </li>
            ))}
            <li>
              <Link href="/cookies#inventory">{t.marketing.footerLinkStorage}</Link>
            </li>
          </ul>
        </nav>

        <nav className="legal__footer-col" aria-label={t.marketing.footerColContact}>
          <p className="legal__footer-title">{t.marketing.footerColContact}</p>
          <ul>
            {/* Три ящика, а не один: у запроса о данных свой срок ответа по
                статье 12 GDPR, и он не должен теряться в общей поддержке. */}
            <li>
              <a href={`mailto:${COMPANY.email.support}`}>{t.marketing.footerContactSupport}</a>
            </li>
            <li>
              <a href={`mailto:${COMPANY.email.privacy}`}>{t.marketing.footerContactPrivacy}</a>
            </li>
            <li>
              <a href={`mailto:${COMPANY.email.legal}`}>{t.marketing.footerContactLegal}</a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="shell legal__footer-base">
        <p className="muted">{fmt(t.marketing.footerRights, { year })}</p>
        <p className="muted">{t.marketing.footerLegalNote}</p>
      </div>
    </footer>
  );
}
