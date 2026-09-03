import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';

import { COMPANY } from '@/features/legal/company';
import { StorageNotice } from '@/features/legal/components/storage-notice';
import { CONSENT_COOKIE, needsDecision, parseConsent } from '@/features/legal/consent';
import '@/features/legal/styles/storage-notice.css';
import { LandingSite } from '@/features/marketing/landing/landing-site';
import '@/features/marketing/landing/styles/index.css';
import { LOCALE_COOKIE, resolveMarketingLocale } from '@/lib/i18n/config';
import { getMessages } from '@/lib/i18n/resolve';

/**
 * Заголовок вкладки и описание — на языке, на котором страница отрисована.
 *
 * Были константой по-русски. Страница при этом встречает незнакомого
 * посетителя по-английски, и в выдаче английский лендинг стоял под русским
 * заголовком, а вкладка в браузере называлась не тем, что в ней открыто.
 *
 * Канонический адрес один, потому что языковых адресов у страницы нет и
 * заводить их нельзя: язык живёт в куке, а не в пути (`i18n/config.ts`).
 * По той же причине здесь нет и `alternates.languages` — `hreflang` обязан
 * указывать на разные адреса, а объявить три языка на одном адресе значит
 * соврать роботу. Цена решения известна: робот увидит ту версию, которую
 * ему отдали по его `Accept-Language`, и про остальные две не узнает.
 * Отдельные адреса под язык это уже продуктовое решение, а не правка
 * разметки, — и принимать его здесь не за что.
 *
 * `og:*` заполняются явно: без них соцсеть берёт заголовок из `<title>`
 * корневого layout — то есть просто «AMOLIE».
 */
export async function generateMetadata(): Promise<Metadata> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = resolveMarketingLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get('accept-language'),
  );
  const t = getMessages(locale).marketing;
  const url = `https://${COMPANY.domain}/`;

  return {
    metadataBase: new URL(url),
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: COMPANY.brand,
      locale,
      url,
      title: t.metaTitle,
      description: t.metaDescription,
    },
  };
}

/**
 * Хром браузера под миром лендинга — бумажный, а не продуктовый розовый:
 * корневой layout объявляет тему кабинета, и на этой странице она была бы
 * полосой чужого цвета над первым экраном.
 */
export const viewport: Viewport = {
  themeColor: '#f5f0ea',
};

const DIRECTION_CONTRACT = `<!--
THESIS: booking is not a feature list. This page shows the product working —
a salon calendar with a client's phone in front of it, a night of booking
messages collapsing into one schedule, one booking page worn by three very
different businesses, and a calendar that grows from one chair to six. It
refuses the category's landing: centred hero over a laptop screenshot, three
feature columns, logo wall, invented testimonials and counts.

OWN-WORLD: warm paper ground (#F5F0EA) with ink type (#0E0E10), one rose
accent (#E2568A) that marks and never decorates, and lilac (#9C86D6) reserved
for the team. Inter throughout, Instrument Serif italic for exactly one
accent phrase per headline. Cards 24-28px, controls 10-14px; shadows are
near-zero and depth comes from layering and daylight.

GROUND: paper, with four full-bleed editorial stills — sunlit studio, salon
interior, cafe table, barber at work — that the page blends into the ground
rather than framing. No glass cards, no icon tiles, no gradient meshes.

STORY: a master arriving from Instagram sees, in one viewport, that clients
pick their own time; then watches the evening she stops spending in her
inbox, the three steps that get her there, the page she would get, what runs
underneath it, how little setup costs her, what her client sees — and enters.

SIGNATURE: every mockup on the page is one day, Tue 9 Sep at Studio Nara,
seen from a different side (landing/lib/day.ts). The hero's phone confirms a
booking and that same booking appears in the calendar behind it.

HONESTY: no prices are invented, no testimonials are attributed, no counts
are claimed. The pricing section says pricing is shown at signup, and the
quotes are labelled placeholders on the page itself.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and DESIGN.md.
-->`;

/**
 * Корневой маркетинговый сайт (ARCHITECTURE.md §3.1): визитка без каталога
 * мастеров. Отличается от арендаторских страниц `[slug]`, которые заменяют
 * будущий поддомен `{username}.amolie.com`.
 *
 * Язык считается на сервере: выбор посетителя из куки, иначе `Accept-Language`,
 * иначе английский. В адрес язык не попадает — ссылки, которые мастера
 * печатают в Instagram, обязаны остаться прежними (`config.ts`).
 */
export default async function MarketingHomePage() {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = resolveMarketingLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get('accept-language'),
  );
  const t = getMessages(locale);

  /*
   * Показывать ли полосу уведомления, решает сервер, а не браузер: иначе она
   * мелькала бы у каждого, кто уже ответил, — на телефоне это заметный скачок
   * над первым экраном.
   */
  const consent = parseConsent(cookieStore.get(CONSENT_COOKIE)?.value);

  return (
    <>
      <div hidden dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />

      {/*
        Отметка «скрипт работает», выставленная до первой отрисовки.

        По ней стилевой слой отличает страницу с живым JavaScript от той, где
        его нет: без него «Вопросы» обязаны стоять раскрытыми, а первый экран
        — не ждать анимации появления. Через `next/script` этого не сделать:
        любая стратегия ставит тег после разметки, и первый кадр успевает
        приехать не в том состоянии.
      */}
      <script
        dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
      />

      <LandingSite t={t.marketing} locale={locale} />

      {needsDecision(consent) ? <StorageNotice t={t.legal} /> : null}
    </>
  );
}
