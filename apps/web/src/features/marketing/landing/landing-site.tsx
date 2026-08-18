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
import { useBlockSnap } from './hooks/use-block-snap';
import { useSmoothScroll } from './hooks/use-smooth-scroll';
import { Closing } from './sections/closing';
import { Hero } from './sections/hero';
import { Looks } from './sections/looks';
import { Nav } from './sections/nav';
import { Night } from './sections/night';
import { Showcase } from './sections/showcase';
import { Steps } from './sections/steps';
import { Threads } from './sections/threads';

export function LandingSite({ t, locale }: { t: Messages['marketing']; locale: Locale }) {
  useSmoothScroll();
  // Anchors land on the resolved state of a block, not on its first frame.
  useAnchorScroll();
  // One screen, one block — except inside the pinned track, which runs its own.
  useBlockSnap('#stage-track');

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
        <Night t={t} />
        <Steps t={t} />
        <Closing t={t} locale={locale} />
      </main>
    </div>
  );
}
