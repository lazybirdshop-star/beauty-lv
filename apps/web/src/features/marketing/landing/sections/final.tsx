/**
 * 15 · Последний экран.
 *
 * Одна кнопка и одна строка под ней. Календарь рядом — не украшение: он
 * повторяет тот же вторник, что и первый экран, и закрывает страницу тем же,
 * чем она открылась.
 */
import type { Messages } from '@/lib/i18n/messages';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import { Calendar } from '../components/calendar';
import { Still } from '../components/still';
import { dayAppointments } from '../lib/day';

const COLUMNS = ['elina', 'marta', 'ruta'] as const;

export function Final({ t }: { t: Messages['marketing'] }) {
  return (
    <section className="final on-ink" id="join" aria-labelledby="final-title">
      <div className="final__bg" aria-hidden="true">
        <Still src="/landing/team-barber.jpg" sizes="100vw" />
      </div>
      <div className="final__glow" aria-hidden="true" />

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

        <div
          className="final__cal reveal"
          style={{ '--delay': '200ms' } as CSSProperties}
          aria-hidden="true"
        >
          <div className="ui">
            <Calendar
              start={9}
              end={13}
              columns={COLUMNS}
              appointments={dayAppointments(COLUMNS, 9, 13)}
              date={t.demoDayShort}
              views={{ day: t.calDay, week: t.calWeek }}
              freeLabel={t.calFree}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
