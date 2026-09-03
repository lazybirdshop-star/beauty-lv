/**
 * 04 · Три шага от свободного времени к записи.
 *
 * Липкая стопка на CSS: панели наезжают друг на друга без единой строки
 * скрипта, поэтому секция работает и до гидратации, и без JavaScript вовсе.
 */
import type { Messages } from '@/lib/i18n/messages';
import type { CSSProperties } from 'react';

import { Still } from '../components/still';

const WEEK_HOURS = [
  { day: 'stepsMon', hours: '09:00 – 17:00', left: '8%', width: '66%', delay: 0 },
  { day: 'stepsTue', hours: '10:00 – 18:00', left: '16%', width: '66%', delay: 80 },
  { day: 'stepsWed', hours: '09:00 – 15:00', left: '8%', width: '50%', delay: 160 },
  { day: 'stepsThu', hours: '11:00 – 19:00', left: '24%', width: '66%', delay: 240 },
  { day: 'stepsFri', hours: '09:00 – 17:00', left: '8%', width: '66%', delay: 320 },
  { day: 'stepsSat', hours: '09:00 – 13:00', left: '8%', width: '33%', delay: 400 },
] as const;

const SERVICES = [
  ['Classic manicure', 45, '€25'],
  ['Gel manicure', 75, '€40'],
  ['Brow shaping', 30, '€18'],
  ['Lash lift', 60, '€45'],
] as const;

export function Steps({ t }: { t: Messages['marketing'] }) {
  return (
    <section className="section steps" id="how" aria-labelledby="how-title">
      <div className="container">
        <ol className="steps__list">
          <li className="step" data-step="1">
            <div className="step__text">
              <div className="steps__head">
                <p className="eyebrow">{t.stepsEyebrow}</p>
                <h2 id="how-title">{t.stepsTitle}</h2>
              </div>
              <span className="step__num">{t.step1Num}</span>
              <h3>{t.step1Title}</h3>
              <p>{t.step1Body}</p>
            </div>
            <div className="step__visual">
              <div className="ui" role="img" aria-label={t.step1Alt}>
                <div className="cal__head">
                  <span className="cal__title">{t.step1CardTitle}</span>
                  <span className="cal__date">{t.step1CardDate}</span>
                  <span className="chip chip--soft" style={{ marginLeft: 'auto' }}>
                    {t.step1CardRepeat}
                  </span>
                </div>
                <div className="avail">
                  {WEEK_HOURS.map((row) => (
                    <div className="avail__row" key={row.day}>
                      <span className="avail__day">{t[row.day]}</span>
                      <div className="avail__bar">
                        <i
                          style={
                            {
                              '--l': row.left,
                              '--w': row.width,
                              '--d': `${row.delay}ms`,
                            } as CSSProperties
                          }
                        >
                          {row.hours}
                        </i>
                      </div>
                    </div>
                  ))}
                  <div className="avail__row">
                    <span className="avail__day">{t.stepsSun}</span>
                    <div className="avail__bar">
                      <i
                        className="off"
                        style={{ '--l': '2%', '--w': '96%', '--d': '480ms' } as CSSProperties}
                      >
                        {t.step1DayOff}
                      </i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </li>

          <li className="step" data-step="2">
            <div className="step__text">
              <span className="step__num">{t.step2Num}</span>
              <h3>{t.step2Title}</h3>
              <p>
                {t.step2BodyBefore} <span className="mono">amolie.com/yourname</span>{' '}
                {t.step2BodyAfter}
              </p>
            </div>
            <div className="step__visual">
              <div className="ui browser" role="img" aria-label={t.step2Alt}>
                <div className="browser__bar">
                  <div className="browser__url">
                    <LockGlyph />
                    amolie.com/<b>studionara</b>
                  </div>
                </div>
                <div className="bk" style={{ padding: '0 22px 22px' }}>
                  <div className="bk__cover" style={{ height: 120, marginTop: 16 }}>
                    <Still src="/landing/cover-nails.jpg" sizes="(max-width: 860px) 90vw, 520px" />
                  </div>
                  <div className="bk__id">
                    <span className="avatar avatar--lg avatar--ink">SN</span>
                    <div>
                      <div className="bk__name">Studio Nara</div>
                      <div className="bk__meta">Nails · Lashes · Hair — Kr. Barona iela, Rīga</div>
                    </div>
                    <span className="ui-btn" style={{ marginLeft: 'auto' }}>
                      {t.bkBook}
                    </span>
                  </div>
                  <p className="bk__label">{t.bkServices}</p>
                  <div className="svc">
                    {SERVICES.map(([name, minutes, price]) => (
                      <div className="svc__row" key={name}>
                        <div>
                          <div className="svc__name">{name}</div>
                          <div className="svc__sub">
                            {minutes} {t.unitMin}
                          </div>
                        </div>
                        <div className="svc__price">{price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </li>

          <li className="step" data-step="3">
            <div className="step__text">
              <span className="step__num">{t.step3Num}</span>
              <h3>{t.step3Title}</h3>
              <p>{t.step3Body}</p>
            </div>
            <div className="step__visual">
              <div className="ui" role="img" aria-label={t.step3Alt} style={{ maxWidth: 420 }}>
                <div className="confirm">
                  <div className="confirm__tick">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </div>
                  <div className="confirm__title">{t.bkDone}</div>
                  <div className="confirm__meta">{t.step3ConfirmMeta}</div>
                  <div className="confirm__row">
                    <b>Gel manicure · 75 {t.unitMin}</b>
                    <span>Elīna Ozola · Studio Nara</span>
                    <span>{t.demoSlotLong}</span>
                  </div>
                  <div className="confirm__row">
                    <b>Laura Vītola</b>
                    <span>+371 2· ··· ···</span>
                  </div>
                </div>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}

export function LockGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}
