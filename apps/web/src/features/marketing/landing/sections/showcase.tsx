'use client';

/**
 * 05 · Витрина страницы записи.
 *
 * Одна система, три заведения. Вкладки переключаются вручную и сами по себе —
 * автопоказ живёт только пока секция на экране и останавливается навсегда,
 * как только читатель выбрал вкладку сам: карусель, которая уезжает из-под
 * пальца, — самый дешёвый способ потерять доверие к продукту.
 *
 * Смена заведения мгновенная: вкладка и содержимое меняются в одном кадре, а
 * новое содержимое лишь проявляется поверх (`key` на макете). Затухание в
 * пустоту с подменой по таймеру оставляло секунду, в которой подсвечена одна
 * вкладка, а в адресе другое заведение.
 */
import type { Messages } from '@/lib/i18n/messages';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';

import { Still } from '../components/still';
import { BUSINESSES, BUSINESS_KEYS, type BusinessKey } from '../lib/businesses';
import { WEEK } from '../lib/week';
import { LockGlyph } from './steps';

const ROTATE_MS = 6000;

export function Showcase({ t }: { t: Messages['marketing'] }) {
  const [active, setActive] = useState<BusinessKey>('nara');
  const [auto, setAuto] = useState(true);
  const stage = useRef<HTMLDivElement>(null);

  const business = BUSINESSES[active];

  const choose = (key: BusinessKey) => {
    setAuto(false);
    setActive(key);
  };

  /* Автопоказ идёт только пока витрина на экране: крутить макеты в фоне —
     работа, за которую платит батарея, и никто её не видит. */
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(Boolean(entries[0]?.isIntersecting)),
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!auto || !visible) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => {
      setActive(
        (current) => BUSINESS_KEYS[(BUSINESS_KEYS.indexOf(current) + 1) % BUSINESS_KEYS.length]!,
      );
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [auto, visible]);

  const onTabKey = (event: KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = BUSINESS_KEYS[(index + step + BUSINESS_KEYS.length) % BUSINESS_KEYS.length]!;
    choose(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <section
      className="section section--warm showcase"
      id="product"
      aria-labelledby="showcase-title"
    >
      <div className="container container--wide">
        <div className="showcase__head">
          <div className="section-head section-head--split showcase__title">
            <div>
              <p className="eyebrow reveal">{t.showcaseEyebrow}</p>
              {/* Без цветного акцента: приём держат только первый и последний
                  экраны, повторённый в каждой секции он становится шаблоном. */}
              <h2 className="statement reveal" id="showcase-title">
                {t.showcaseTitle}
              </h2>
            </div>
            <p className="sub reveal" style={{ '--delay': '80ms' } as CSSProperties}>
              {t.showcaseSub}
            </p>
          </div>

          <div className="showcase__bar reveal" style={{ '--delay': '120ms' } as CSSProperties}>
            <div className="seg" role="tablist" aria-label={t.showcaseTabsLabel}>
              {BUSINESS_KEYS.map((key, index) => (
                <button
                  key={key}
                  id={`tab-${key}`}
                  className={key === active ? 'seg__btn is-on' : 'seg__btn'}
                  role="tab"
                  type="button"
                  aria-selected={key === active}
                  aria-controls="bk-stage"
                  tabIndex={key === active ? 0 : -1}
                  onClick={() => choose(key)}
                  onKeyDown={(event) => onTabKey(event, index)}
                >
                  {BUSINESSES[key].name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="showcase__stage reveal" style={{ '--delay': '200ms' } as CSSProperties}>
          <div
            className="ui browser"
            id="bk-stage"
            role="tabpanel"
            aria-labelledby={`tab-${active}`}
            ref={stage}
          >
            <div className="browser__bar">
              <div className="browser__url">
                <LockGlyph />
                amolie.com/<b>{business.slug}</b>
              </div>
            </div>

            <div className="bk-desktop" key={active}>
              <div className="bk-desktop__left">
                <div className="bk__cover">
                  <Still src={business.cover} sizes="(max-width: 860px) 90vw, 460px" />
                </div>
                <div className="bk__id">
                  <span className="avatar avatar--lg avatar--ink">{business.initials}</span>
                  <div>
                    <div className="bk__name">{business.name}</div>
                    <div className="bk__meta">{t[business.meta]}</div>
                  </div>
                </div>

                <p className="bk__label">{t.bkService}</p>
                <div className="svc">
                  {business.services.map((service) => (
                    <div className={service.on ? 'svc__row is-on' : 'svc__row'} key={service.name}>
                      <div>
                        <div className="svc__name">{t[service.name]}</div>
                        <div className="svc__sub">
                          {service.minutes ? `${service.minutes} ${t.unitMin}` : t.bkPerNail}
                        </div>
                      </div>
                      <div className="svc__price">{service.free ? t.bkFree : service.price}</div>
                    </div>
                  ))}
                </div>

                {business.team ? (
                  <div>
                    <p className="bk__label">{t.bkSpecialist}</p>
                    <div className="people">
                      {business.team.map((member) => (
                        <span
                          className={member.on ? 'person is-on' : 'person'}
                          key={member.initials}
                        >
                          <span className={`avatar ${member.tone}`}>{member.initials}</span>
                          {member.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="bk-desktop__right">
                <p className="bk__label" style={{ marginTop: 0 }}>
                  {t.demoMonth}
                </p>
                <div className="days">
                  {WEEK.map((day) => (
                    <span
                      className={day.on ? 'day is-on' : day.off ? 'day is-off' : 'day'}
                      key={day.date}
                    >
                      <small>{t[day.day]}</small>
                      {day.date}
                    </span>
                  ))}
                </div>

                <p className="bk__label">{t.bkAvailableTimes}</p>
                <div className="times">
                  {business.times.map((time, index) => (
                    <span
                      key={time}
                      className={[
                        'time',
                        time === business.selected ? 'is-on' : '',
                        business.taken.includes(index) ? 'is-off' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {time}
                    </span>
                  ))}
                </div>

                <p className="bk__label">{t.bkYourDetails}</p>
                <div className="bk__fields">
                  <span className="bk__field is-filled">Laura Vītola</span>
                  <span className="bk__field is-filled">+371 2· ··· ···</span>
                </div>

                <div className="summary">
                  <div>
                    <b>
                      {t[business.summary.service]}
                      {business.summary.person ? ` · ${business.summary.person}` : ''}
                    </b>
                    <span>
                      {t.demoSlotShort} · {business.selected} · {business.price}
                    </span>
                  </div>
                  <span className="ui-btn ui-btn--pink">{t.bkConfirm}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
