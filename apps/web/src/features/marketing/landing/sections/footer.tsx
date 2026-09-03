/**
 * 16 · Подвал.
 *
 * Стоит вне `<main>` — это опора сайта, а не последний его аргумент.
 *
 * К «Продукту» и «Аккаунту» присланного макета добавлены «Правовое» и
 * «Связь»: политика, условия, опись хранимого в устройстве и почта для
 * запросов о данных обязаны быть достижимы с любой публичной страницы, а
 * ящиков три, потому что у запроса о данных свой срок ответа по статье 12
 * GDPR и теряться в общей поддержке он не должен.
 *
 * Колонки «Follow» из макета здесь нет: обе ссылки в ней вели на `#`, а
 * мёртвая ссылка в подвале хуже её отсутствия.
 */
import { COMPANY } from '@/features/legal/company';
import type { Messages } from '@/lib/i18n/messages';
import { fmt } from '@/lib/i18n/messages';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Horizontal } from '../components/logo';
import { NAV_LINKS } from './nav';

/**
 * Подпись колонки — `<h4>`, а не `<h2>`: читалка обходит страницу по
 * заголовкам, и три служебные метки подвала не имеют права весить в этом
 * обходе столько же, сколько разделы, ради которых страница написана.
 */
function Column({ title, children }: { title: string; children: ReactNode }) {
  const id = `footer-col-${title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-')}`;

  return (
    <nav className="footer__col" aria-labelledby={id}>
      <h4 id={id}>{title}</h4>
      <ul>{children}</ul>
    </nav>
  );
}

export function Footer({ t }: { t: Messages['marketing'] }) {
  /* Год берётся в момент отрисовки: на сервере и в браузере он совпадает в
     любой день, кроме новогодней ночи, а страница пересобирается чаще. */
  const year = new Date().getFullYear();

  return (
    <footer className="footer on-ink">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Horizontal />
          <p>{t.footerTagline}</p>
        </div>

        <Column title={t.footerColProduct}>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{t[link.key]}</a>
            </li>
          ))}
        </Column>

        <Column title={t.footerColAccount}>
          <li>
            <Link href="/login">{t.logIn}</Link>
          </li>
          <li>
            <Link href="/register">{t.signUp}</Link>
          </li>
        </Column>

        <Column title={t.footerColLegal}>
          <li>
            <Link href="/privacy">{t.footerLinkPrivacy}</Link>
          </li>
          <li>
            <Link href="/terms">{t.footerLinkTerms}</Link>
          </li>
          <li>
            <Link href="/cookies">{t.footerLinkCookies}</Link>
          </li>
          <li>
            <Link href="/cookies#inventory">{t.footerLinkStorage}</Link>
          </li>
        </Column>

        <Column title={t.footerColContact}>
          <li>
            <a href={`mailto:${COMPANY.email.support}`}>{t.footerContactSupport}</a>
          </li>
          <li>
            <a href={`mailto:${COMPANY.email.privacy}`}>{t.footerContactPrivacy}</a>
          </li>
          <li>
            <a href={`mailto:${COMPANY.email.legal}`}>{t.footerContactLegal}</a>
          </li>
        </Column>
      </div>

      <div className="container footer__bottom">
        <span>{fmt(t.footerRights, { year })}</span>
        <span>{t.footerPlace}</span>
        <p className="footer__disclaimer">{t.footerLegalNote}</p>
      </div>
    </footer>
  );
}
