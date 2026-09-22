/**
 * Корень мира лендинга — серверный.
 *
 * Граница «сервер → клиент» проходит не здесь, а внутри: страница считает
 * язык на сервере, а в браузере живёт ровно то, что без него не работает —
 * `ScrollEffects` с двумя наблюдателями за страницей и те секции, что сами
 * объявили себя клиентскими (шапка, «Проблема», «Витрина», «Что видит
 * клиент», «Рост», вопросы). «Возможности», «Соло», «Три шага», «Тарифы»,
 * финал и подвал остаются на сервере: состояния у них нет, а гидратировать
 * маркетинговый документ целиком мобильный посетитель не обязан.
 *
 * Порядок секций — порядок разговора: заявление, боль, как это устроено, как
 * это выглядит, кому это, что под капотом, что видит клиент, деньги,
 * возражения, вход.
 *
 * Отзывов здесь нет, пока нет настоящих: подписанная «заготовка» на странице
 * хуже пустого места. Отдельных секций «сравнение» и «настройка» тоже нет —
 * первая повторяла «Соло» и «Рост», вторая — «Три шага».
 */
import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/messages';

import { ScrollEffects } from './scroll-effects';
import { Capabilities } from './sections/capabilities';
import { ClientFlow } from './sections/client-flow';
import { Faq } from './sections/faq';
import { Final } from './sections/final';
import { Footer } from './sections/footer';
import { Growth } from './sections/growth';
import { Hero } from './sections/hero';
import { Nav } from './sections/nav';
import { Pricing } from './sections/pricing';
import { Problem } from './sections/problem';
import { Showcase } from './sections/showcase';
import { Solo } from './sections/solo';
import { Steps } from './sections/steps';

export function LandingSite({ t, locale }: { t: Messages['marketing']; locale: Locale }) {
  return (
    <ScrollEffects>
      <div lang={locale}>
        {/* Цель ссылки «наверх» — начало документа. Липкая шапка ею быть не
            может: она всегда в кадре, и переход к ней никуда не прокручивал. */}
        <span id="top" />
        <a className="visually-hidden" href="#main">
          {t.skipToContent}
        </a>

        <Nav t={t} locale={locale} />

        <main id="main">
          <Hero t={t} />
          <Problem t={t} />
          <Steps t={t} />
          <Showcase t={t} />
          <Solo t={t} locale={locale} />
          <Growth t={t} locale={locale} />
          <Capabilities t={t} />
          <ClientFlow t={t} />
          <Pricing t={t} />
          {/* Возражения — последнее, что стоит между «понял» и «пробую», и
              потому идут прямо перед кнопкой. */}
          <Faq t={t} />
          <Final t={t} />
        </main>

        <Footer t={t} />
      </div>
    </ScrollEffects>
  );
}
