'use client';

/**
 * Клиентский корень мира лендинга.
 *
 * Граница «сервер → клиент» проходит ровно здесь: страница считает язык на
 * сервере и отдаёт сюда готовый словарь, а всё, что ниже, живёт в браузере —
 * плавная прокрутка, сцена на WebGL и хореография по скроллу. Разметка при
 * этом по-прежнему приезжает в HTML: клиентский компонент Next рендерит и на
 * сервере, поэтому поисковику и читателю без JavaScript достаётся текст, а не
 * пустой контейнер.
 */
import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/messages';

import { MockupStage } from './components/mockup-stage';
import { useAnchorScroll } from './hooks/use-anchor-scroll';
import { useSmoothScroll } from './hooks/use-smooth-scroll';
import { Closing } from './sections/closing';
import { Faq } from './sections/faq';
import { Hero } from './sections/hero';
import { Looks } from './sections/looks';
import { Minute } from './sections/minute';
import { Nav } from './sections/nav';
import { Night } from './sections/night';
import { Showcase } from './sections/showcase';
import { Steps } from './sections/steps';
import { Threads } from './sections/threads';

export function LandingSite({ t, locale }: { t: Messages['marketing']; locale: Locale }) {
  useSmoothScroll();
  // Anchors land on the resolved state of a block, not on its first frame.
  useAnchorScroll();

  /*
   * Доводки до края блока здесь нет намеренно.
   *
   * Она была: страница подтягивалась к ближайшей границе секции, если та
   * оказывалась ближе 40% высоты экрана. Между секциями ровно один экран,
   * значит подтягивало почти отовсюду — и подтягивало не всегда: в верхней
   * половине страницы точек притяжения густо, в нижней их нет вовсе. Замер по
   * десяти остановкам подряд: пять раз страница уезжала сама, в среднем на
   * 213px, однажды на 458px за полторы секунды, а следующие пять раз стояла.
   * Это и читается как «где-то цепляется, где-то едет» — не рывок кадра, а
   * страница, которая трогается после того, как читатель её отпустил.
   *
   * Ориентиры продукта — Apple, Linear, Stripe — прокрутку не доводят.
   * Единственная оставшаяся доводка живёт в `MockupStage`: она вытаскивает
   * читателя из середины поворота устройства, где поза не значит ничего, и у
   * неё есть работа. Общей доводки по секциям у страницы больше нет.
   */

  return (
    <div className="amolie-site" lang={locale}>
      <a className="skip-link" href="#steps">
        {t.skipToContent}
      </a>

      <Nav t={t} locale={locale} />

      {/* One track, one device. The hero and the showcase share it, which is why
          the phone is never re-mounted between them. */}
      <div id="stage-track" className="stage-track">
        <MockupStage trackId="stage-track" />
        <Hero t={t} />
        <Showcase t={t} />
      </div>

      <main>
        <Threads t={t} />
        <Looks t={t} />
        {/* Единственный светлый блок страницы — и единственное место, где
            продукт видно вживую, а не силуэтом. */}
        <Minute t={t} />
        <Night t={t} />
        <Steps t={t} />
        {/* Возражения — последнее, что стоит между «понял» и «пробую», и
            потому идут прямо перед кнопкой. */}
        <Faq t={t} />
        <Closing t={t} />
      </main>
    </div>
  );
}
