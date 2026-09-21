/**
 * 12 · Последний экран.
 *
 * Одна кнопка и одна строка под ней — и ничего больше. Седьмой календарь
 * того же вторника здесь уже ничего не доказывал: страница показала день со
 * всех сторон, и последний экран отдан только решению.
 */
import type { Messages } from '@/lib/i18n/messages';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import { Still } from '../components/still';

export function Final({ t }: { t: Messages['marketing'] }) {
  return (
    <section className="final on-ink" id="join" aria-labelledby="final-title">
      <div className="final__bg" aria-hidden="true">
        <Still src="/landing/team-barber.jpg" sizes="100vw" />
      </div>
      <div className="container final__grid">
        <div className="final__text">
          <h2 id="final-title" className="reveal">
            {t.finalTitle} <em className="serif">{t.finalTitleAccent}</em>
          </h2>
          <p className="lede reveal" style={{ '--delay': '100ms' } as CSSProperties}>
            {t.finalLede}
          </p>
          <div className="cta-row reveal" style={{ '--delay': '160ms' } as CSSProperties}>
            <Link className="btn btn--primary btn--lg" href="/register" data-magnetic>
              {t.signUp}
            </Link>
            <span className="reassure reassure--ink">{t.finalReassure}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
