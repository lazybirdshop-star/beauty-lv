/**
 * 08 · Что работает под страницей записи.
 *
 * Шесть плиток, и в каждой не иконка, а кусок настоящего интерфейса. Иконка
 * обещает функцию, интерфейс её показывает — а обещаниями категория и так
 * переполнена.
 */
import type { Messages } from '@/lib/i18n/messages';
import type { CSSProperties } from 'react';

import { Calendar } from '../components/calendar';
import type { Appointment } from '../lib/day';

const BENTO_COLUMNS = ['elina', 'marta', 'toms'] as const;

const BENTO_DAY: Appointment[] = [
  { col: 0, at: '10:00', minutes: 75, service: 'Gel manicure', client: 'Marija P.' },
  { col: 0, at: '11:30', minutes: 45, service: 'Classic manicure', client: 'Elza R.' },
  { col: 0, at: '12:30', minutes: 60, free: true },
  { col: 1, at: '10:30', minutes: 30, service: 'Brow shaping', client: 'Zane B.' },
  {
    col: 1,
    at: '11:15',
    minutes: 75,
    service: 'Gel manicure',
    client: 'Laura V.',
    tone: 'appt--new',
  },
  { col: 1, at: '12:45', minutes: 45, service: 'Classic manicure', client: 'Kate P.' },
  { col: 2, at: '10:00', minutes: 45, service: 'Haircut', client: 'Mārtiņš R.' },
  { col: 2, at: '11:00', minutes: 50, service: 'Skin fade', client: 'Emīls K.' },
  { col: 2, at: '12:00', minutes: 30, service: 'Beard trim', client: 'Toms B.' },
  { col: 2, at: '12:45', minutes: 45, service: 'Haircut', client: 'Rihards A.' },
];

const CLIENT_ROWS = [
  ['LV', 'avatar--pink', 'Laura Vītola', '9 Sep', 'Gel manicure', '€40'],
  ['KJ', '', 'Kristīne Jansone', '9 Sep', 'Gel manicure', '€40'],
  ['MR', 'avatar--paper', 'Mārtiņš Roze', '9 Sep', 'Haircut', '€35'],
  ['AS', 'avatar--ink', 'Anete Sproģe', '9 Sep', 'Brow shaping', '€18'],
  ['DK', '', 'Dana Krūmiņa', '9 Sep', 'Classic manicure', '€25'],
  ['IL', 'avatar--pink', 'Ilze Liepa', '9 Sep', 'Lash lift', '€45'],
  ['TB', '', 'Toms Bērziņš', '9 Sep', 'Beard trim', '€20'],
  ['IK', 'avatar--pink', 'Ieva Kalēja', '27 Aug', 'Classic manicure', '€25'],
  ['ZB', 'avatar--paper', 'Zane Bērziņa', '22 Aug', 'Brow tint', '€15'],
  ['EK', '', 'Emīls Kalniņš', '18 Aug', 'Skin fade', '€30'],
  ['MP', 'avatar--ink', 'Marija Priede', '14 Aug', 'Gel manicure', '€40'],
] as const;

const SERVICE_ROWS = [
  ['Gel manicure', '75', '10', '€40'],
  ['Lash lift', '60', null, '€45'],
  ['Haircut', '45', null, '€35'],
  ['Skin fade', '50', null, '€30'],
] as const;

export function Capabilities({ t }: { t: Messages['marketing'] }) {
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
              <div className="ui">
                <Calendar
                  start={10}
                  end={14}
                  columns={BENTO_COLUMNS}
                  appointments={BENTO_DAY}
                  title={t.calWednesday}
                  date="10 Sep"
                  views={{ day: t.calDay, week: t.calWeek }}
                  freeLabel={t.calFree}
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
              <div className="ui">
                <div className="panel">
                  <div className="panel__title">
                    {t.panelClients} <small>{t.bentoClientsTools}</small>
                  </div>
                  <div
                    className="quick__input"
                    style={{ marginBottom: 10, borderColor: 'var(--hair)' }}
                  >
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
                    <span style={{ color: 'var(--muted)' }}>{t.bentoClientsSearch}</span>
                  </div>
                  <div className="list">
                    {CLIENT_ROWS.map(([initials, tone, name, date, service, price]) => (
                      <div className="list__row" key={name}>
                        <span className={`avatar ${tone}`}>{initials}</span>
                        <div>
                          <b>{name}</b>
                          <small>
                            {t.bentoLastVisit.replace('{date}', date)} · {service}
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
              <div className="ui">
                <div className="panel">
                  <div className="panel__title">
                    {t.panelServices} <small>{t.bentoEdit}</small>
                  </div>
                  <div className="list">
                    {SERVICE_ROWS.map(([name, minutes, buffer, price]) => (
                      <div className="list__row" key={name}>
                        <span />
                        <div>
                          <b>{name}</b>
                          <small>
                            {minutes} {t.unitMin}
                            {buffer ? ` · ${t.bentoBuffer.replace('{minutes}', buffer)}` : ''}
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
              <div className="ui">
                <div className="mini-team">
                  <div className="panel__title" style={{ margin: '0 0 4px' }}>
                    {t.calWednesday} <small>{t.bentoChairs.replace('{count}', '3')}</small>
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
                  <div className="mini-team__row">
                    <span className="avatar">EO</span>
                    <div className="mini-team__bar">
                      <i style={{ '--l': '0%', '--w': '21%' } as CSSProperties}>Gel</i>
                      <i style={{ '--l': '25%', '--w': '13%' } as CSSProperties} />
                      <i className="lilac" style={{ '--l': '58%', '--w': '25%' } as CSSProperties}>
                        Lash lift
                      </i>
                    </div>
                  </div>
                  <div className="mini-team__row">
                    <span className="avatar avatar--pink">MK</span>
                    <div className="mini-team__bar">
                      <i style={{ '--l': '8%', '--w': '9%' } as CSSProperties} />
                      <i className="pink" style={{ '--l': '21%', '--w': '21%' } as CSSProperties}>
                        {t.bentoNew}
                      </i>
                      <i style={{ '--l': '46%', '--w': '13%' } as CSSProperties} />
                    </div>
                  </div>
                  <div className="mini-team__row">
                    <span className="avatar avatar--ink">TL</span>
                    <div className="mini-team__bar">
                      <i style={{ '--l': '0%', '--w': '13%' } as CSSProperties} />
                      <i style={{ '--l': '17%', '--w': '14%' } as CSSProperties} />
                      <i style={{ '--l': '33%', '--w': '9%' } as CSSProperties} />
                      <i style={{ '--l': '46%', '--w': '13%' } as CSSProperties} />
                    </div>
                  </div>
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
              <div className="ui">
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
                      <b>Gel manicure · Marta</b>
                      <small>{t.bentoQuickResult}</small>
                    </div>
                    <span className="ui-btn">{t.bkBook}</span>
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
              <div className="ui">
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
