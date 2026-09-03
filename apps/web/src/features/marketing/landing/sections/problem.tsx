'use client';

/**
 * 03 · Проблема.
 *
 * Куча ночных сообщений сходится в один календарь по мере прокрутки. Сцена
 * липкая, а прогресс — одно число в `--p`; никакого перехвата прокрутки:
 * читатель, который решил проехать секцию, проезжает её.
 *
 * Реплики — единственное место на странице, где текст изображает переписку,
 * поэтому они в словаре, а не в мокапе: чужой язык здесь читается как чужая
 * страница.
 */
import type { Messages } from '@/lib/i18n/messages';
import { useRef, type CSSProperties } from 'react';

import { Calendar } from '../components/calendar';
import { useSceneProgress } from '../hooks/use-scroll-scene';
import { dayAppointments } from '../lib/day';

const COLUMNS = ['elina', 'marta'] as const;

/** Раскладка облаков: вход по прогрессу, место, наклон. */
const BUBBLES = [
  { key: 'problemMsg1', at: '22:14', in: -0.2, x: '4%', y: '2%', r: '-4deg', out: false },
  { key: 'problemMsg2', at: '22:31', in: -0.16, x: '62%', y: '10%', r: '3deg', out: true },
  { key: 'problemMsg3', at: '23:05', in: -0.12, x: '8%', y: '30%', r: '-2deg', out: false },
  { key: 'problemMsg4', at: '23:41', in: 0.06, x: '2%', y: '52%', r: '5deg', out: false },
  { key: 'problemMsg5', at: '23:58', in: 0.13, x: '60%', y: '58%', r: '-3deg', out: true },
  { key: 'problemMsg6', at: '07:02', in: 0.2, x: '28%', y: '70%', r: '2deg', out: false },
  { key: 'problemMsg7', at: '07:19', in: 0.27, x: '70%', y: '80%', r: '-6deg', out: false },
  { key: 'problemMsg8', at: '08:40', in: 0.34, x: '4%', y: '84%', r: '4deg', out: false },
  { key: 'problemMsg9', at: '08:52', in: 0.41, x: '44%', y: '26%', r: '-2deg', out: true },
  { key: 'problemMsg10', at: '09:10', in: 0.48, x: '40%', y: '92%', r: '3deg', out: false },
] as const;

export function Problem({ t }: { t: Messages['marketing'] }) {
  const scene = useRef<HTMLElement>(null);
  useSceneProgress(scene);

  return (
    <section className="problem on-ink" id="problem" aria-labelledby="problem-title" ref={scene}>
      <div className="problem__sticky">
        <div className="container problem__inner">
          <h2 id="problem-title">{t.problemTitle}</h2>

          <div className="chaos" role="img" aria-label={t.problemChaosAlt}>
            {BUBBLES.map((bubble) => (
              <div
                key={bubble.key}
                className={bubble.out ? 'bubble bubble--out' : 'bubble'}
                style={
                  {
                    '--in': bubble.in,
                    '--x': bubble.x,
                    '--y': bubble.y,
                    '--r': bubble.r,
                    '--cx': '50%',
                    '--cy': '50%',
                  } as CSSProperties
                }
              >
                {t[bubble.key]}
                <time>{bubble.at}</time>
              </div>
            ))}

            <div className="resolve">
              <div className="ui">
                <Calendar
                  start={10}
                  end={14}
                  columns={COLUMNS}
                  appointments={dayAppointments(COLUMNS, 10, 14, [
                    { col: 0, at: '13:30', minutes: 30, free: true },
                  ])}
                  date={t.demoDayShort}
                  views={{ day: t.calDay, week: t.calWeek }}
                  freeLabel={t.calFree}
                />
              </div>
            </div>
          </div>

          <p className="problem__copy">
            {t.problemCopyBefore} <strong>{t.problemCopyStrong}</strong> {t.problemCopyAfter}
          </p>
        </div>
      </div>
    </section>
  );
}
