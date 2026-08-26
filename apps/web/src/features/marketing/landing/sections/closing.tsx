import type { Messages } from '@/lib/i18n/messages';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import { Reveal } from '../components/reveal';
import { nb } from '../lib/typo';

export function Closing({ t }: { t: Messages['marketing'] }) {
  return (
    <section className="section closing" id="closing">
      <Reveal className="shell closing__inner">
        <h2 className="h2 closing__head rise">
          {t.closingTitleA}
          <br />
          {t.closingTitleB}
        </h2>

        <div className="closing__side">
          <p className="lede rise" style={{ '--d': '120ms' } as CSSProperties}>
            {nb(t.closingBody)}
          </p>

          {/* Приписки под кнопкой больше нет по решению владельца: «карта для
              старта не нужна» и так сказано абзацем выше — оплата начинается с
              первой записи, — и вторая строка про то же только разбавляла
              единственную кнопку внизу страницы. */}
          <div className="cta-group rise" style={{ '--d': '240ms' } as CSSProperties}>
            <Link className="btn btn--solid" href="/register">
              {t.closingCta}
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
