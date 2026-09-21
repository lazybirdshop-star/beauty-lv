/**
 * 08 · Что работает под страницей записи.
 *
 * Шесть плиток, и в каждой не иконка, а кусок настоящего интерфейса. Иконка
 * обещает функцию, интерфейс её показывает — а обещаниями категория и так
 * переполнена.
 */
import type { Locale } from '@/lib/i18n/config';
import { fmt, plural, type Messages } from '@/lib/i18n/messages';
import type { CSSProperties } from 'react';

import { Calendar, memberStyle } from '../components/calendar';
import { PEOPLE, dayAppointments, type PersonKey, type ServiceKey } from '../lib/day';

const BENTO_COLUMNS = ['elina', 'marta', 'toms'] as const;

/**
 * Тот же вторник, что и во всей странице, но утром, до первого клиента:
 * плитка обещает «видеть день до того, как он начался», поэтому линии
 * «сейчас» в ней нет. Окно в 12:00 у Томса — единственное свободное.
 */
const BENTO_DAY = dayAppointments(BENTO_COLUMNS, 10, 14, [
  { col: 2, at: '12:00', minutes: 60, free: true },
]);

/**
 * Командный день в плитке — дорожки по мастеру, как лента дня на главной
 * кабинета, шкала с 10:00 до 16:00. Отрезки сняты с того же дня
 * (`lib/day.ts`), а «Новая» — запись Лауры на 14:30, которую она только что
 * сделала сама; отвечать на неё не нужно, поэтому она обведена тоном
 * мастера, а не нарисована пунктиром «ждёт ответа».
 */
type TeamSegment = { l: string; w: string; label?: ServiceKey; fresh?: boolean };

const TEAM_ROWS: { person: PersonKey; segments: TeamSegment[] }[] = [
  {
    person: 'elina',
    segments: [
      { l: '16.7%', w: '12.5%' },
      { l: '41.7%', w: '16.7%', label: 'svcLashLift' },
      { l: '75%', w: '20.8%', fresh: true },
    ],
  },
  {
    person: 'marta',
    segments: [
      { l: '0%', w: '8.3%' },
      { l: '16.7%', w: '20.8%', label: 'svcGelManicure' },
      { l: '50%', w: '12.5%' },
      { l: '75%', w: '8.3%' },
    ],
  },
  {
    person: 'toms',
    segments: [
      { l: '0%', w: '8.3%' },
      { l: '16.7%', w: '13.9%' },
      { l: '50%', w: '12.5%' },
    ],
  },
];

/** Дата последнего визита: день и месяц, собранные по правилам языка. */
type VisitDate = { day: number; month: 'demoMonthSepShort' | 'demoMonthAugShort' };

/**
 * Клиенты салона на тот же вторник, 14:02. Все, кто уже побывал сегодня,
 * пришли на свои утренние записи; у Лауры визит в 14:30 ещё впереди, поэтому
 * её последний визит — август, а не сегодняшнее число.
 */
const CLIENT_ROWS: readonly (readonly [string, string, string, VisitDate, ServiceKey, string])[] = [
  ['KJ', '', 'Kristīne Jansone', { day: 9, month: 'demoMonthSepShort' }, 'svcGelManicure', '€40'],
  [
    'MR',
    'avatar--paper',
    'Mārtiņš Roze',
    { day: 9, month: 'demoMonthSepShort' },
    'svcHaircut',
    '€35',
  ],
  [
    'AS',
    'avatar--ink',
    'Anete Sproģe',
    { day: 9, month: 'demoMonthSepShort' },
    'svcBrowShaping',
    '€18',
  ],
  ['TB', '', 'Toms Bērziņš', { day: 9, month: 'demoMonthSepShort' }, 'svcBeardTrim', '€20'],
  ['DK', '', 'Dana Krūmiņa', { day: 9, month: 'demoMonthSepShort' }, 'svcClassicManicure', '€25'],
  [
    'IL',
    'avatar--pink',
    'Ilze Liepa',
    { day: 9, month: 'demoMonthSepShort' },
    'svcLashLift',
    '€45',
  ],
  [
    'IK',
    'avatar--pink',
    'Ieva Kalēja',
    { day: 27, month: 'demoMonthAugShort' },
    'svcClassicManicure',
    '€25',
  ],
  [
    'ZB',
    'avatar--paper',
    'Zane Bērziņa',
    { day: 22, month: 'demoMonthAugShort' },
    'svcBrowTint',
    '€15',
  ],
  [
    'LV',
    'avatar--pink',
    'Laura Vītola',
    { day: 19, month: 'demoMonthAugShort' },
    'svcGelManicure',
    '€40',
  ],
  ['EK', '', 'Emīls Kalniņš', { day: 18, month: 'demoMonthAugShort' }, 'svcSkinFade', '€30'],
  [
    'MP',
    'avatar--ink',
    'Marija Priede',
    { day: 14, month: 'demoMonthAugShort' },
    'svcGelManicure',
    '€40',
  ],
];

const SERVICE_ROWS: readonly (readonly [ServiceKey, string, string | null, string])[] = [
  ['svcGelManicure', '75', '10', '€40'],
  ['svcLashLift', '60', null, '€45'],
  ['svcHaircut', '45', null, '€35'],
  ['svcSkinFade', '50', null, '€30'],
];

export function Capabilities({ t, locale }: { t: Messages['marketing']; locale: Locale }) {
  const visitDate = ({ day, month }: VisitDate) => fmt(t.demoDate, { day, month: t[month] });

  return (
    <section className="section" id="features" aria-labelledby="features-title">
      <div className="container container--wide">
        <div className="section-head section-head--split reveal">
          <div>
            <p className="eyebrow">{t.bentoEyebrow}</p>
            <h2 id="features-title">{t.bentoTitle}</h2>
          </div>
          <p className="sub">{t.bentoSub}</p>
        </div>

        <div className="bento">
          <article className="tile tile--calendar reveal">
            <div className="tile__ui">
              <div className="ui ui--dash">
                <Calendar
                  start={10}
                  end={14}
                  columns={BENTO_COLUMNS}
                  appointments={BENTO_DAY}
                  title={t.calToday}
                  date={t.demoDayShort}
                  views={{ day: t.calDay, week: t.calWeek }}
                  freeLabel={t.calFree}
                  services={t}
                />
              </div>
            </div>
            <div className="tile__text">
              <h3>{t.bentoCalendarTitle}</h3>
              <p>{t.bentoCalendarBody}</p>
            </div>
          </article>

          <article
            className="tile tile--clients reveal"
            style={{ '--delay': '80ms' } as CSSProperties}
          >
            <div className="tile__ui">
              <div className="ui ui--dash">
                <div className="panel">
                  <div className="panel__title">
                    {t.panelClients} <small>{t.bentoClientsTools}</small>
                  </div>
                  <div className="quick__input" style={{ marginBottom: 10 }}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      aria-hidden="true"
                    >
                      <circle cx="7" cy="7" r="4.5" />
                      <path d="M10.5 10.5L14 14" />
                    </svg>
                    <span className="quick__placeholder">{t.bentoClientsSearch}</span>
                  </div>
                  <div className="list">
                    {CLIENT_ROWS.map(([initials, tone, name, date, service, price]) => (
                      <div className="list__row" key={name}>
                        <span className={`avatar ${tone}`}>{initials}</span>
                        <div>
                          <b>{name}</b>
                          <small>
                            {fmt(t.bentoLastVisit, { date: visitDate(date) })} · {t[service]}
                          </small>
                        </div>
                        <span className="r">{price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="tile__text">
              <h3>{t.bentoClientsTitle}</h3>
              <p>{t.bentoClientsBody}</p>
            </div>
          </article>

          <article
            className="tile tile--services reveal"
            style={{ '--delay': '120ms' } as CSSProperties}
          >
            <div className="tile__ui">
              <div className="ui ui--dash">
                <div className="panel">
                  <div className="panel__title">
                    {t.panelServices} <small>{t.bentoEdit}</small>
                  </div>
                  <div className="list">
                    {SERVICE_ROWS.map(([name, minutes, buffer, price]) => (
                      <div className="list__row" key={name}>
                        <span />
                        <div>
                          <b>{t[name]}</b>
                          <small>
                            {minutes} {t.unitMin}
                            {buffer ? ` · ${fmt(t.bentoBuffer, { minutes: buffer })}` : ''}
                          </small>
                        </div>
                        <span className="r">{price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="tile__text">
              <h3>{t.bentoServicesTitle}</h3>
              <p>{t.bentoServicesBody}</p>
            </div>
          </article>

          <article
            className="tile tile--team reveal"
            style={{ '--delay': '160ms' } as CSSProperties}
          >
            <div className="tile__ui">
              <div className="ui ui--dash">
                <div className="mini-team">
                  <div className="panel__title" style={{ margin: '0 0 4px' }}>
                    {t.calToday}{' '}
                    <small>
                      3{'\u00a0'}
                      {plural(locale, 3, t.growthChairForms)}
                    </small>
                  </div>
                  <div className="mini-team__axis">
                    <span />
                    <div>
                      <i>10:00</i>
                      <i>12:00</i>
                      <i>14:00</i>
                      <i>16:00</i>
                    </div>
                  </div>
                  {TEAM_ROWS.map((row) => (
                    <div
                      className="mini-team__row"
                      key={row.person}
                      style={memberStyle(PEOPLE[row.person].tone)}
                    >
                      <span className="cal__avatar">{PEOPLE[row.person].initials}</span>
                      <div className="mini-team__bar">
                        {row.segments.map((segment) => (
                          <i
                            key={segment.l}
                            className={segment.fresh ? 'is-fresh' : undefined}
                            style={{ '--l': segment.l, '--w': segment.w } as CSSProperties}
                          >
                            {segment.fresh ? t.bentoNew : segment.label ? t[segment.label] : null}
                          </i>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="tile__text">
              <h3>{t.bentoTeamTitle}</h3>
              <p>{t.bentoTeamBody}</p>
            </div>
          </article>

          <article
            className="tile tile--manual reveal"
            style={{ '--delay': '120ms' } as CSSProperties}
          >
            <div className="tile__ui">
              <div className="ui ui--dash">
                <div className="quick">
                  <div className="quick__input">
                    <span>{t.bentoQuickTyped}</span>
                    <span className="caret" />
                  </div>
                  <div className="quick__hint">
                    <span className="quick__kbd">{t.bentoQuickEnter}</span>
                    <span className="quick__kbd">{t.bentoQuickTab}</span>
                    <span className="quick__kbd">{t.bentoQuickEsc}</span>
                  </div>
                  <div className="quick__result">
                    <span className="avatar avatar--pink">LV</span>
                    <div>
                      <b>{t.svcGelManicure} · Marta</b>
                      <small>{t.bentoQuickResult}</small>
                    </div>
                    <span className="ui-btn">{t.bkBookFor}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="tile__text">
              <h3>{t.bentoManualTitle}</h3>
              <p>{t.bentoManualBody}</p>
            </div>
          </article>

          <article
            className="tile tile--controls reveal"
            style={{ '--delay': '200ms' } as CSSProperties}
          >
            <div className="tile__ui">
              <div className="ui ui--dash">
                <div className="roles">
                  <div className="role">
                    <div>
                      <b>Marta Kalniņa</b>
                      <small>{t.bentoRoleSpecialist}</small>
                    </div>
                    <span className="toggle" />
                  </div>
                  <div className="role">
                    <div>
                      <b>{t.bentoRoleReception}</b>
                      <small>{t.bentoRoleReceptionMeta}</small>
                    </div>
                    <span className="toggle" />
                  </div>
                  <div className="payout">
                    <div>
                      <b>{t.bentoPayoutTitle}</b>
                      <small>{t.bentoPayoutMeta}</small>
                    </div>
                    <div className="r">
                      <b>{t.bentoPayoutReady}</b>
                      <small>{t.bentoPayoutReview}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="tile__text">
              <h3>{t.bentoControlsTitle}</h3>
              <p>{t.bentoControlsBody}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
