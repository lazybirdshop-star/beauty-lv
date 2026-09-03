'use client';

/**
 * 02 · Первый экран.
 *
 * Заявление, одна кнопка — и сцена: календарь салона, а поверх него телефон
 * клиентки со страницей записи. Раз в семь секунд она подтверждает время,
 * запись появляется в календаре и над ним всплывает уведомление. Это весь
 * продукт в одном кадре: клиент выбирает — у мастера появляется запись.
 *
 * Петля идёт состоянием React, а не переключением классов на узлах: узлов
 * три, и держать их синхронно таймерами значило бы каждый раз чинить кадр,
 * в котором кнопка уже сказала «Записано», а карточки ещё нет.
 */
import type { Messages } from '@/lib/i18n/messages';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Calendar } from '../components/calendar';
import { Phone, PhoneStatus } from '../components/phone';
import { Still } from '../components/still';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { useParallax } from '../hooks/use-scroll-scene';
import { dayAppointments, type Appointment } from '../lib/day';

const COLUMNS = ['elina', 'marta', 'ruta'] as const;

/** Полный цикл петли: 7 с. Подтверждение на 2.2 с, уведомление гаснет на 5.6 с. */
const LOOP_MS = 7000;
const CONFIRM_AT_MS = 2200;
const TOAST_OFF_MS = 5600;

export function Hero({ t }: { t: Messages['marketing'] }) {
  const stage = useRef<HTMLDivElement>(null);
  useParallax(stage);

  const reduced = useReducedMotion();
  const [confirmed, setConfirmed] = useState(false);
  const [toast, setToast] = useState(false);

  /* Отказ от анимации — не отказ от смысла: запись показана на месте, просто
     она была там с самого начала. */
  const booked = reduced || confirmed;

  useEffect(() => {
    if (reduced) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    const cycle = () => {
      setConfirmed(false);
      setToast(false);
      timers.push(
        setTimeout(() => {
          setConfirmed(true);
          setToast(true);
        }, CONFIRM_AT_MS),
        setTimeout(() => setToast(false), TOAST_OFF_MS),
      );
    };

    timers.push(setTimeout(cycle, 600));
    const loop = setInterval(cycle, LOOP_MS);

    return () => {
      clearInterval(loop);
      for (const timer of timers) clearTimeout(timer);
    };
  }, [reduced]);

  /* Расписание собирается на глазах: карточки приезжают через 70 мс друг за
     другом, а запись клиентки — последней, ровно под нажатие на телефоне. */
  const appointments = useMemo<Appointment[]>(() => {
    let index = 0;
    return dayAppointments(COLUMNS, 9, 17).flatMap((appointment) => {
      if (appointment.tone === 'appt--new') {
        return booked ? [{ ...appointment, popDelayMs: 0 }] : [];
      }
      return [{ ...appointment, popDelayMs: 700 + index++ * 70 }];
    });
  }, [booked]);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__bg" aria-hidden="true">
        <Still src="/landing/hero-studio.jpg" priority sizes="100vw" />
      </div>

      <div className="container container--wide hero__inner">
        <div className="hero__copy">
          <p className="eyebrow">{t.heroEyebrow}</p>
          <h1 id="hero-title">
            {t.heroTitle} <em className="serif">{t.heroTitleAccent}</em>
          </h1>
          <p className="lede">{t.heroLede}</p>
          <div className="hero__cta">
            <p className="hero__setup">{t.heroSetup}</p>
            <div className="cta-row">
              <Link className="btn btn--primary btn--lg" href="/register" data-magnetic>
                {t.signUp}
              </Link>
              <a className="btn btn--secondary btn--lg" href="#how" data-magnetic>
                {t.heroSeeHow}
                <svg
                  className="btn__arrow"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M8 3v10M4 9l4 4 4-4" />
                </svg>
              </a>
            </div>
          </div>
          <p className="reassure">{t.heroReassure}</p>
        </div>

        <ul className="hero__for" aria-label={t.heroForLabel}>
          {[t.heroForNails, t.heroForBrows, t.heroForHair, t.heroForSalons, t.heroForBarbers].map(
            (audience) => (
              <li key={audience}>{audience}</li>
            ),
          )}
        </ul>

        <div className="stage" ref={stage} role="img" aria-label={t.heroStageAlt}>
          <div className="stage__glow" aria-hidden="true" />

          <div className="ui stage__cal" aria-hidden="true">
            <Calendar
              start={9}
              end={17}
              columns={COLUMNS}
              appointments={appointments}
              date={t.demoDayShort}
              views={{ day: t.calDay, week: t.calWeek }}
              freeLabel={t.calFree}
            />
            <div className={toast ? 'toast is-on' : 'toast'}>
              <span className="toast__dot" />
              <div>
                <b>{t.heroToastTitle}</b>
                <span>{t.heroToastMeta}</span>
              </div>
            </div>
          </div>

          <div className="stage__phone" aria-hidden="true">
            <Phone>
              <div className="phone__screen">
                <PhoneStatus time="14:02" />
                <div className="phone__body">
                  <div className="bk">
                    <div className="bk__cover">
                      <Still src="/landing/cover-nails.jpg" sizes="320px" />
                    </div>
                    <div className="bk__id">
                      <span className="avatar avatar--lg avatar--ink">SN</span>
                      <div>
                        <div className="bk__name">Studio Nara</div>
                        <div className="bk__meta">Nails · Lashes · Hair — Rīga</div>
                      </div>
                    </div>
                    <p className="bk__label">{t.bkService}</p>
                    <div className="svc">
                      <div className="svc__row is-on">
                        <div>
                          <div className="svc__name">Gel manicure</div>
                          <div className="svc__sub">75 {t.unitMin}</div>
                        </div>
                        <div className="svc__price">€40</div>
                      </div>
                    </div>
                    <p className="bk__label">{t.bkSpecialist}</p>
                    <div className="people">
                      <span className="person is-on">
                        <span className="avatar">EO</span>Elīna
                      </span>
                      <span className="person">
                        <span className="avatar avatar--pink">MK</span>Marta
                      </span>
                      <span className="person">
                        <span className="avatar avatar--paper">RB</span>Rūta
                      </span>
                    </div>
                    <p className="bk__label">{t.demoDayLong}</p>
                    <div className="times">
                      <span className="time is-off">10:00</span>
                      <span className="time">11:30</span>
                      <span className="time is-off">13:00</span>
                      <span className="time is-on">14:30</span>
                      <span className="time">16:00</span>
                      <span className="time">17:15</span>
                    </div>
                  </div>
                </div>
                <div className="phone__foot">
                  <div className="summary">
                    <div>
                      <b>Gel manicure · Elīna</b>
                      <span>{t.demoSlotSummary}</span>
                    </div>
                  </div>
                  <div
                    className={
                      booked
                        ? 'ui-btn ui-btn--pink ui-btn--block is-done'
                        : 'ui-btn ui-btn--pink ui-btn--block'
                    }
                  >
                    {booked ? t.bkBooked : t.bkConfirm}
                  </div>
                </div>
              </div>
            </Phone>
          </div>
        </div>
      </div>
    </section>
  );
}
