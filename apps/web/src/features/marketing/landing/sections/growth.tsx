'use client';

/**
 * 07 · Рост в салон.
 *
 * Один стул → три → шесть, и всё это один и тот же календарь: колонки не
 * появляются заново, а раздвигаются. Довод секции — «ваши клиенты, услуги и
 * ссылка остаются на месте» — держится именно на этом: заведение растёт, а
 * страница записи та же самая.
 */
import type { Messages } from '@/lib/i18n/messages';
import { useRef, type CSSProperties } from 'react';

import { Calendar } from '../components/calendar';
import { Still } from '../components/still';
import { useGrowthStage } from '../hooks/use-scroll-scene';
import { dayAppointments } from '../lib/day';

const COLUMNS = ['elina', 'marta', 'ruta', 'toms', 'anna', 'janis'] as const;

const STAGES = [
  { chairs: 1, body: 'growthStage1' },
  { chairs: 3, body: 'growthStage3' },
  { chairs: 6, body: 'growthStage6' },
] as const;

export function Growth({ t }: { t: Messages['marketing'] }) {
  const scene = useRef<HTMLElement>(null);
  const stage = useGrowthStage(scene);

  const capabilities = [
    t.growthCapSchedule,
    t.growthCapClients,
    t.growthCapRoles,
    t.growthCapBookFor,
    t.growthCapOverview,
    t.growthCapPayouts,
  ];

  return (
    <section
      className="growth"
      id="salons"
      data-stage={stage}
      aria-labelledby="growth-title"
      ref={scene}
    >
      <div className="growth__sticky">
        <div className="growth__bg" aria-hidden="true">
          <Still src="/landing/cover-salon.jpg" sizes="100vw" />
        </div>

        <div className="container container--wide growth__grid">
          <div className="growth__text">
            <div>
              <p className="eyebrow" style={{ marginBottom: 20 }}>
                {t.growthEyebrow}
              </p>
              <h2 id="growth-title">{t.growthTitle}</h2>
            </div>
            <p className="sub">{t.growthSub}</p>

            <ol className="growth__stages" aria-label={t.growthStagesLabel}>
              {STAGES.map((item) => (
                <li
                  className={item.chairs === stage ? 'gstage is-on' : 'gstage'}
                  data-gstage={item.chairs}
                  key={item.chairs}
                >
                  <span className="gstage__n num">
                    {item.chairs}
                    <small>{t.growthChairs}</small>
                  </span>
                  <p>{t[item.body]}</p>
                </li>
              ))}
            </ol>
          </div>

          <ul className="growth__caps" aria-label={t.growthCapsLabel}>
            {capabilities.map((capability, index) => (
              <li key={capability} style={{ '--i': index } as CSSProperties}>
                {capability}
              </li>
            ))}
          </ul>

          <div className="growth__cal" role="img" aria-label={t.growthCalAlt}>
            <div className="ui">
              <Calendar
                start={9}
                end={16}
                columns={COLUMNS}
                appointments={dayAppointments(COLUMNS, 9, 16)}
                date={t.demoDayShort}
                views={{ day: t.calDay, week: t.calWeek }}
                ghost={t.calAddSpecialist}
                visibleColumns={stage}
                freeLabel={t.calFree}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
