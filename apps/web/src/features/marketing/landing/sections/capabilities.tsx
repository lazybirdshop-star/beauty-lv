/**
 * 08 · Что работает под страницей записи.
 *
 * Три плитки, и в каждой не иконка, а кусок настоящего интерфейса. Иконка
 * обещает функцию, интерфейс её показывает — а обещаниями категория и так
 * переполнена.
 *
 * Только то, чего не говорит ни одна другая секция: день наперёд, услуга,
 * за длительностью которой идут окна, и запись по звонку. Список клиентов
 * уже показан в «Соло», команда, роли и выплаты — в «Росте»; плитки,
 * повторявшие их, делали страницу длиннее, а не убедительнее.
 */
import { fmt, type Messages } from '@/lib/i18n/messages';
import type { CSSProperties } from 'react';

import { Calendar } from '../components/calendar';
import { dayAppointments, type ServiceKey } from '../lib/day';

const BENTO_COLUMNS = ['elina', 'marta', 'toms'] as const;

/**
 * Тот же вторник, что и во всей странице, но утром, до первого клиента:
 * плитка обещает «видеть день до того, как он начался», поэтому линии
 * «сейчас» в ней нет. Окно в 12:00 у Томса — единственное свободное.
 */
const BENTO_DAY = dayAppointments(BENTO_COLUMNS, 10, 14, [
  { col: 2, at: '12:00', minutes: 60, free: true },
]);

const SERVICE_ROWS: readonly (readonly [ServiceKey, string, string | null, string])[] = [
  ['svcGelManicure', '75', '10', '€40'],
  ['svcLashLift', '60', null, '€45'],
  ['svcHaircut', '45', null, '€35'],
  ['svcSkinFade', '50', null, '€30'],
];

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
            className="tile tile--services reveal"
            style={{ '--delay': '80ms' } as CSSProperties}
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
        </div>
      </div>
    </section>
  );
}
