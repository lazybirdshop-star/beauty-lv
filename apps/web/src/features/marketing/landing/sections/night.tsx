/* Full-bleed photography, one screen tall. Nothing pins: the photograph and
   the words travel up together, as one piece. The text sits in the quiet dark
   third of the actual frame, so no overlay is needed to make it legible
   (IMG-06). */
import type { Messages } from '@/lib/i18n/messages';
import type { CSSProperties } from 'react';

import { Reveal } from '../components/reveal';
import { nb } from '../lib/typo';

export function Night({ t }: { t: Messages['marketing'] }) {
  return (
    <section className="night" data-snap>
      <div className="night__media">
        {/* Обычный <img>, а не next/image: снимок раскладывается средствами
            CSS во весь блок (`object-fit: cover` внутри `.night__media`), и
            обёртка оптимизатора добавила бы сюда свой слой позиционирования
            поверх авторского. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/night-table.jpg" alt={t.nightAlt} />
      </div>

      <Reveal className="night__copy shell">
        <p className="label num rise">02:14</p>
        <h2 className="h2 rise" style={{ '--d': '120ms' } as CSSProperties}>
          {t.nightTitleA}
          <br />
          {t.nightTitleB}
        </h2>
        <p className="lede rise" style={{ '--d': '240ms' } as CSSProperties}>
          {nb(t.nightBody)}
        </p>
      </Reveal>
    </section>
  );
}
