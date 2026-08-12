import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';

import { Assurances } from '@/features/marketing/components/assurances';
import { Closing } from '@/features/marketing/components/closing';
import { Hero } from '@/features/marketing/components/hero';
import { MeshBackdrop } from '@/features/marketing/components/mesh-backdrop';
import { SiteFooter } from '@/features/marketing/components/site-footer';
import { SiteHeader } from '@/features/marketing/components/site-header';
import { Steps } from '@/features/marketing/components/steps';
import { Thread } from '@/features/marketing/components/thread';
import '@/features/marketing/marketing.css';
import { LOCALE_COOKIE, resolveMarketingLocale } from '@/lib/i18n/config';
import { getMessages } from '@/lib/i18n/resolve';

export const metadata: Metadata = {
  title: 'AMOLIE — online booking for beauty professionals',
  description:
    'You open the time, they take it. A booking page for independent beauty professionals in Latvia. No calls, no message threads, no double bookings.',
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
THESIS: booking is not a feature list. This page shows the master's page
itself, at full scale, and refuses the category's landing: centred hero over
a laptop screenshot, three feature columns, logo wall, invented testimonials
and counts.

OWN-WORLD: restrained premium in the register the user pinned (floema.com).
Warm greige ground (#EDE9E3), near-black ink (#16130F), one wine accent
carried from the AMOLIE mark (#A63A5F) at 5.0:1. Generous air, hairline
rules that fade at both ends, numbered narrative, one dark band as the only
change of ground. No glass, no cards, no icon tiles.

GROUND: the ground is not flat. Two gradient fields, both drawn from the
wine mark diluted into greige, sit behind the page and nowhere else — a
light one under the first screen, dissolving into the flat ground before
the story starts, and an ember one inside the single dark band. Grain over
both: the fields must read as printed, not rendered. They are colour behind
content, never a surface to place content on, and never bright enough to
take contrast from the text above them (scripts/landing-contrast.mjs).

STORY: an independent master arriving from Instagram understands in one
viewport that she publishes moments and clients take them, sees the page she
would get, and either enters with her code or reads five steps and then
enters.

FIRST VIEWPORT: a two-line claim hard-left at clamp(2.5rem,7.4vw,4.75rem),
the second line in wine; to its right the master page rendered as a real
object, dark on light, its taken windows struck through. The primary action
sits under the claim, ink-filled, turning wine on hover.

FORM: candidate 5 of the grounded list (Latvian woven belt) was the roll's
assignment, seed key fd68befe; the user then pinned floema.com as the
register, and a pinned brief beats the roll. Built as pinned.

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
  const t = getMessages(locale).marketing;

  return (
    <div lang={locale} className="amolie-landing relative isolate flex min-h-full flex-col">
      <div hidden dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />

      {/* Поле первого экрана заходит под шапку — знак и язык стоят на нём, а
          не на полосе над ним, — и растворяется в землю мира выше того места,
          где начинается рассказ. Высота в svh, потому что на телефоне
          «экран» меняет размер вместе с адресной строкой. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[clamp(34rem,96svh,64rem)]">
        <MeshBackdrop tone="dawn" />
      </div>

      <a
        href="#steps"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:bg-[var(--lp-ink)] focus:px-4 focus:py-2 focus:text-[var(--lp-ink-inverse)]"
      >
        {t.skipToContent}
      </a>

      <SiteHeader t={t} locale={locale} />
      <main className="flex-1">
        <Hero t={t} />
        {/* «До» стоит сразу за «после»: страница, принимающая запись сама,
            и переписка, которую она отменяет, читаются одной парой. */}
        <Thread t={t} />
        <Steps t={t} />
        <Assurances t={t} />
        <Closing t={t} />
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
