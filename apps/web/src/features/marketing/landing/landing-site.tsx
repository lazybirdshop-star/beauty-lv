'use client';

/**
 * Клиентский корень мира лендинга.
 *
 * Граница «сервер → клиент» проходит ровно здесь: страница считает язык на
 * сервере и отдаёт сюда готовый словарь, а всё, что ниже, живёт в браузере —
 * появление по скроллу, липкие сцены и петли мокапов. Разметка при этом
 * по-прежнему приезжает в HTML: клиентский компонент Next рисует и на
 * сервере, поэтому поисковику и читателю без JavaScript достаётся вся
 * страница целиком, а не пустой контейнер.
 *
 * Порядок секций — порядок разговора: заявление, боль, как это устроено, как
 * это выглядит, кому это, что под капотом, сколько времени займёт, что видит
 * клиент, чужой опыт, соло или команда, деньги, возражения, вход.
 */
import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/messages';

import { useMagnetic } from './hooks/use-magnetic';
import { useReveal } from './hooks/use-reveal';
import { Capabilities } from './sections/capabilities';
import { ClientFlow } from './sections/client-flow';
import { Compare } from './sections/compare';
import { Faq } from './sections/faq';
import { Final } from './sections/final';
import { Footer } from './sections/footer';
import { Growth } from './sections/growth';
import { Hero } from './sections/hero';
import { Nav } from './sections/nav';
import { Pricing } from './sections/pricing';
import { Problem } from './sections/problem';
import { Proof } from './sections/proof';
import { Setup } from './sections/setup';
import { Showcase } from './sections/showcase';
import { Solo } from './sections/solo';
import { Steps } from './sections/steps';

export function LandingSite({ t, locale }: { t: Messages['marketing']; locale: Locale }) {
  useReveal();
  useMagnetic();

  return (
    <div lang={locale}>
      <a className="visually-hidden" href="#main">
        {t.skipToContent}
      </a>

      <Nav t={t} locale={locale} />

      <main id="main">
        <Hero t={t} />
        <Problem t={t} />
        <Steps t={t} />
        <Showcase t={t} />
        <Solo t={t} />
        <Growth t={t} />
        <Capabilities t={t} />
        <Setup t={t} />
        <ClientFlow t={t} />
        <Proof t={t} />
        <Compare t={t} />
        <Pricing t={t} />
        {/* Возражения — последнее, что стоит между «понял» и «пробую», и
            потому идут прямо перед кнопкой. */}
        <Faq t={t} />
        <Final t={t} />
      </main>

      <Footer t={t} />
    </div>
  );
}
