/**
 * 12 · Соло и команда.
 *
 * Два столбца и стрелка между ними: слева календарь в одну колонку, справа
 * тот же самый в три и с пунктирной «добавить мастера». Довод — не «две
 * разные версии продукта», а «одна, которая растёт», поэтому и календарь по
 * обе стороны один и тот же день.
 */
import type { Messages } from '@/lib/i18n/messages';
import Link from 'next/link';

import { Calendar } from '../components/calendar';
import { dayAppointments } from '../lib/day';

const SOLO = ['elina'] as const;
const TEAM = ['elina', 'marta', 'toms'] as const;

export function Compare({ t }: { t: Messages['marketing'] }) {
  const soloList = [
    t.compareSoloLink,
    t.compareSoloServices,
    t.compareSoloHours,
    t.compareSoloCalendar,
    t.compareSoloClients,
    t.compareSoloNoAccount,
  ];

  const teamList = [
    t.compareTeamColumn,
    t.compareTeamSchedule,
    t.compareTeamRoles,
    t.compareTeamClients,
    t.compareTeamBookFor,
    t.compareTeamPayouts,
  ];

  return (
    <section className="section" id="compare" aria-labelledby="compare-title">
      <div className="container">
        <div className="section-head section-head--split reveal">
          <div>
            <p className="eyebrow">{t.compareEyebrow}</p>
            <h2 id="compare-title">{t.compareTitle}</h2>
          </div>
          <p className="sub">{t.compareSub}</p>
        </div>

        <div className="compare reveal">
          <div className="compare__col compare__col--solo">
            <div className="compare__ui" role="img" aria-label={t.compareSoloAlt}>
              <div className="ui">
                <Calendar
                  start={9}
                  end={13}
                  columns={SOLO}
                  appointments={dayAppointments(SOLO, 9, 13, [
                    { col: 0, at: '12:00', minutes: 30, free: true },
                  ])}
                  title={t.calToday}
                  date={t.demoDayShort}
                  views={null}
                  freeLabel={t.calFree}
                />
              </div>
            </div>
            <div>
              <p className="eyebrow eyebrow--pink" style={{ marginBottom: 10 }}>
                {t.soloEyebrow}
              </p>
              <h3>{t.compareSoloTitle}</h3>
            </div>
            <ul className="compare__list">
              {soloList.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div>
              <Link className="btn btn--primary" href="/register" data-magnetic>
                {t.compareSoloCta}
              </Link>
            </div>
          </div>

          <div className="compare__bridge" aria-hidden="true">
            <span>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </span>
          </div>

          <div className="compare__col compare__col--team">
            <div className="compare__ui" role="img" aria-label={t.compareTeamAlt}>
              <div className="ui">
                <Calendar
                  start={9}
                  end={13}
                  columns={TEAM}
                  appointments={dayAppointments(TEAM, 9, 13, [
                    { col: 2, at: '12:00', minutes: 60, free: true },
                  ])}
                  date={t.demoDayShort}
                  views={null}
                  ghost={t.calAddSpecialist}
                  freeLabel={t.calFree}
                />
              </div>
            </div>
            <div>
              <p className="eyebrow" style={{ marginBottom: 10, color: 'var(--lilac-deep)' }}>
                {t.compareTeamEyebrow}
              </p>
              <h3>{t.compareTeamTitle}</h3>
            </div>
            <ul className="compare__list">
              {teamList.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div>
              <Link className="btn btn--primary" href="/register" data-magnetic>
                {t.compareTeamCta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
