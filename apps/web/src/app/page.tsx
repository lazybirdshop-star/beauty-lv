import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';

import { StorageNotice } from '@/features/legal/components/storage-notice';
import { CONSENT_COOKIE, needsDecision, parseConsent } from '@/features/legal/consent';
import '@/features/legal/styles/legal.css';
import { LandingSite } from '@/features/marketing/landing/landing-site';
import '@/features/marketing/landing/styles/index.css';
import { LOCALE_COOKIE, resolveMarketingLocale } from '@/lib/i18n/config';
import { getMessages } from '@/lib/i18n/resolve';

export const metadata: Metadata = {
  title: 'AMOLIE — онлайн-запись для мастеров индустрии красоты',
  description:
    'Страница записи для мастеров и салонов. Клиенты выбирают время сами, круглосуточно, без звонков и переписки.',
};

/**
 * Хром браузера под миром лендинга — чернильный, а не продуктовый розовый:
 * корневой layout объявляет тему кабинета, и на этой странице она была бы
 * полосой чужого цвета над первым экраном.
 */
export const viewport: Viewport = {
  themeColor: '#0e0e10',
};

/**
 * Контракт направления для мира лендинга.
 *
 * Отгружается настоящим HTML-комментарием, а не JSX: JSX-комментарий
 * компилятор выбрасывает, а этот обязан пережить прод-сборку и находиться
 * grep-ом по built-выводу. У публичной страницы мастера свой контракт, в
 * корневом layout, и путать их нельзя — это разные миры.
 */
const DIRECTION_CONTRACT = `<!--
THESIS: booking is not a feature list. This page shows the product as an
object: the master's own device, at full scale, turning once to exchange the
client-facing booking page for her own cabinet. It refuses the category's
landing — centred hero over a laptop screenshot, three feature columns, logo
wall, invented testimonials and counts.

OWN-WORLD: ink ground (#0E0E10) with paper type (#F5F0EA) and one rose accent
(#E2568A) that marks and never decorates. Onest in two weights, display at
300. Radius is 999px or 0, nothing between. One easing curve for the whole
world, cubic-bezier(.22, 1, .36, 1). Generous air, hairline rules, film grain
over everything so flat ink and photography read as one material.

GROUND: the ground is flat ink. What moves on it is light, not colour — a
photographed sweep behind the first screen, an accent bloom under the device,
and a conic glint travelling the two panel borders. No blue-violet gradient,
no glass cards, no icon tiles, no notification cards.

STORY: an independent master arriving from Instagram sees, in one viewport,
that she opens the time and clients take it; then watches the page she would
get do four things without her; then reads the thread she stops having, the
faces the page can wear, the night it works through, and the order of work —
and enters.

FIRST VIEWPORT: label, a two-line claim centred high, one solid CTA with its
reassurance line. The optical centre carries the object, not the type: the
device rises from below the fold and owns the lower two thirds. This is the
one deliberate override of CMP-01, by direct request, and it is paid for by
giving the centre to the object.

SIGNATURE: one interaction for the page (MOT-04) — the device on a fixed
layer shared by the hero and the showcase, turning 360 degrees on scroll,
swapping its screen at exactly half a turn where the glass faces away, with
four callouts arriving together as it comes back round.

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

      <LandingSite t={t.marketing} locale={locale} />

      {needsDecision(consent) ? <StorageNotice t={t.legal} /> : null}
    </>
  );
}
