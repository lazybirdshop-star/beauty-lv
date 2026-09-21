'use client';

/**
 * 02 · Первый экран.
 *
 * Заявление, одна кнопка — и сцена: день одного мастера, Elīna, а поверх
 * него телефон клиентки с её страницей записи. Раз в семь секунд клиентка
 * подтверждает время, запись занимает свободное окно в календаре и над ним
 * всплывает уведомление. Это весь продукт в одном кадре: клиент выбирает —
 * у мастера появляется запись.
 *
 * Кадр соло, а не салона: основной читатель — мастер, работающий одна, и
 * первое, что она видит, обязано быть её днём. Команда появляется ниже, в
 * «Росте», — тем же календарём, в который приходят коллеги.
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

const COLUMNS = ['elina'] as const;

/** Одна минута на обоих экранах: часы телефона и линия «сейчас» в календаре. */
const NOW = '14:02';

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
    /* Свободное окно то же, что в «Соло»: один день, увиденный дважды. */
    return dayAppointments(COLUMNS, 9, 17, [
      { col: 0, at: '16:00', minutes: 60, free: true },
    ]).flatMap((appointment) => {
      if (appointment.fresh) {
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
          <div className="ui ui--dash stage__cal" aria-hidden="true">
            <Calendar
              start={9}
              end={17}
              columns={COLUMNS}
              appointments={appointments}
              title={t.calToday}
              date={t.demoDayShort}
              views={{ day: t.calDay, week: t.calWeek }}
              now={NOW}
              freeLabel={t.calFree}
              services={t}
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
                <PhoneStatus time={NOW} />
                <div className="phone__body">
                  <div className="bk">
                    <div className="bk__cover">
                      <Still src="/landing/cover-nails.jpg" sizes="320px" />
                    </div>
                    <div className="bk__id">
                      <span className="avatar avatar--lg avatar--ink">EO</span>
                      <div>
                        <div className="bk__name">Elīna</div>
                        <div className="bk__meta">{t.heroPageMeta}</div>
                      </div>
                    </div>
                    <p className="bk__label">{t.bkService}</p>
                    <div className="svc">
                      <div className="svc__row is-on">
                        <div>
                          <div className="svc__name">{t.svcGelManicure}</div>
                          <div className="svc__sub">75 {t.unitMin}</div>
                        </div>
                        <div className="svc__price">€40</div>
                      </div>
                    </div>
                    <p className="bk__label">{t.demoDayLong}</p>
                    {/* На часах 14:02 — утренние окна уже прошли, и страница
                        записи их не показывает. 16:00 открыто, как и
                        свободное окно в календаре за телефоном. */}
                    <div className="times">
                      <span className="time is-on">14:30</span>
                      <span className="time is-off">15:15</span>
                      <span className="time">16:00</span>
                      <span className="time is-off">16:45</span>
                      <span className="time is-off">17:30</span>
                      <span className="time">18:15</span>
                    </div>
                  </div>
                </div>
                <div className="phone__foot">
                  <div className="summary">
                    <div>
                      <b>{t.svcGelManicure}</b>
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
