/**
 * Подвал лендинга.
 *
 * Стоит вне `<main>` и вне блока «Закрытие» — это опора страницы, а не её
 * последний аргумент. Раньше здесь были знак и две строки приписки; теперь
 * подвал несёт то, что по закону обязано быть достижимо с любой публичной
 * страницы: политику конфиденциальности, условия использования, описание
 * хранения в устройстве и адрес, по которому идут запросы о данных.
 *
 * Ссылки на разделы страницы вернулись именно сюда, а не в шапку: наверху
 * оглавление отвлекало бы от первого экрана, внизу — помогает тому, кто
 * дочитал и хочет вернуться.
 */
import { COMPANY } from '@/features/legal/company';
import type { Messages } from '@/lib/i18n/messages';
import { fmt } from '@/lib/i18n/messages';
import Link from 'next/link';

import { Horizontal } from '../components/logo';

/**
 * Колонка ссылок: заголовок и список. Три одинаковых блока — один компонент.
 *
 * Подпись колонки была `<h2>` — то есть в оглавлении документа «ПРОДУКТ»,
 * «ПРАВОВОЕ» и «СВЯЗЬ» стояли наравне с «Как это устроено» и «Шесть честных
 * ответов». Читалка обходит страницу по заголовкам, и три служебные метки
 * подвала весили в этом обходе столько же, сколько разделы, ради которых
 * страница написана.
 *
 * Теперь это `<p>`, а список получает ту же подпись через `aria-labelledby`:
 * группа названа, но оглавления не занимает. Идентификатор считается от
 * названия — оно и так уникально в пределах подвала.
 */
function Column({ title, children }: { title: string; children: React.ReactNode }) {
  const id = `footer-col-${title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-')}`;

  return (
    <div className="footer__col">
      <p className="footer__col-title" id={id}>
        {title}
      </p>
      <ul className="footer__list" aria-labelledby={id}>
        {children}
      </ul>
    </div>
  );
}

export function Footer({ t }: { t: Messages['marketing'] }) {
  /*
   * Год берётся в момент отрисовки. На сервере и в браузере он один и тот же
   * в любой день, кроме новогодней ночи, а страница пересобирается чаще, чем
   * раз в год, — заводить ради этого пропс не за чем.
   */
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <hr className="rule shell-rule" />

      <div className="shell footer__inner">
        <div className="footer__brand">
          <Horizontal className="footer__mark" />
          <p className="footer__tagline">{t.footerTagline}</p>
          <p className="footer__note muted">
            {t.footerPlace}
            <br />
            {t.footerData}
          </p>
        </div>

        <nav className="footer__cols" aria-label={t.footerNav}>
          <Column title={t.footerColProduct}>
            <li>
              <a href="#showcase">{t.footerLinkShowcase}</a>
            </li>
            <li>
              <a href="#steps">{t.footerLinkSteps}</a>
            </li>
            <li>
              <a href="#faq">{t.footerLinkFaq}</a>
            </li>
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
            {/* Три ящика, а не один: у запроса о данных свой срок ответа по
                статье 12 GDPR, и он не должен теряться в общей поддержке. */}
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
        </nav>
      </div>

      <div className="shell footer__base">
        <p className="footer__rights muted">{fmt(t.footerRights, { year })}</p>
        <p className="footer__disclaimer muted">{t.footerLegalNote}</p>
      </div>
    </footer>
  );
}
