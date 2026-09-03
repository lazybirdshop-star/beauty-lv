'use client';

/**
 * 10 · Как это выглядит для клиента.
 *
 * Телефон проигрывает запись в четыре касания: услуга, мастер, время,
 * подтверждение. Петля идёт только пока секция на экране — за её пределами
 * таймеры останавливаются, иначе телефон анимируется всю страницу подряд и
 * съедает батарею ради кадра, которого никто не видит.
 *
 * Кружок касания и «улетающее» время считаются по фактическим координатам
 * узлов, а не по числам в CSS: раскладка резиновая, и любое зашитое смещение
 * промахнулось бы на первой же другой ширине экрана.
 */
import type { Messages } from '@/lib/i18n/messages';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

import { Phone, PhoneStatus } from '../components/phone';
import { Still } from '../components/still';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { WEEK } from '../lib/week';

const SERVICES = [
  ['Classic manicure', 45, '€25'],
  ['Gel manicure', 75, '€40'],
  ['Brow shaping', 30, '€18'],
  ['Lash lift', 60, '€45'],
] as const;

const TIMES = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:15', '18:30', '19:00'] as const;
const TAKEN = new Set(['10:00', '13:00', '18:30']);

/* Без анимации показан разобранный шаг «когда?»: уже видно, что услуга и
   мастер выбраны, и виден сам выбор времени — то есть всё, ради чего сцена
   существует. */
const RESOLVED_SCREEN = 2;
const RESOLVED_PICKS = new Set([0, 1, 2]);

export function ClientFlow({ t }: { t: Messages['marketing'] }) {
  const reduced = useReducedMotion();
  const [played, setPlayed] = useState(0);
  const [pickedInLoop, setPickedInLoop] = useState<Set<number>>(new Set());
  const [tap, setTap] = useState<{ x: number; y: number; nonce: number } | null>(null);
  const [flying, setFlying] = useState(false);

  const screen = reduced ? RESOLVED_SCREEN : played;
  const picked = reduced ? RESOLVED_PICKS : pickedInLoop;

  const body = useRef<HTMLDivElement>(null);
  const pickService = useRef<HTMLDivElement>(null);
  const pickPerson = useRef<HTMLDivElement>(null);
  const pickTime = useRef<HTMLSpanElement>(null);
  const slotTarget = useRef<HTMLSpanElement>(null);
  const cta = useRef<HTMLDivElement>(null);
  const fly = useRef<HTMLSpanElement>(null);

  /* Кружок касания ставится по центру правой трети элемента — там, где палец
     и правда оказывается, а не по геометрическому центру строки. */
  const tapOn = useCallback((element: HTMLElement | null) => {
    const frame = body.current;
    if (!element || !frame) return;
    const rect = element.getBoundingClientRect();
    const base = frame.getBoundingClientRect();
    setTap({
      x: rect.left - base.left + rect.width * 0.6,
      y: rect.top - base.top + rect.height / 2,
      nonce: Date.now(),
    });
  }, []);

  const [running, setRunning] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = stage.current;
    if (!node || reduced) return;

    const observer = new IntersectionObserver(
      (entries) => setRunning(Boolean(entries[0]?.isIntersecting)),
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (!running || reduced) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, run: () => void) => timers.push(setTimeout(run, ms));

    const cycle = () => {
      setPlayed(0);
      setPickedInLoop(new Set());
      setFlying(false);

      at(900, () => {
        tapOn(pickService.current);
        setPickedInLoop((set) => new Set(set).add(0));
      });
      at(1320, () => setPlayed(1));

      at(2400, () => {
        tapOn(pickPerson.current);
        setPickedInLoop((set) => new Set(set).add(1));
      });
      at(2820, () => setPlayed(2));

      at(3900, () => {
        tapOn(pickTime.current);
        setPickedInLoop((set) => new Set(set).add(2));
      });
      at(4300, () => {
        setPlayed(3);
        setFlying(true);
      });
      at(5100, () => setFlying(false));
      at(5700, () => tapOn(cta.current));
      at(6100, () => setPlayed(4));
      at(8200, cycle);
    };

    cycle();
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [running, reduced, tapOn]);

  /* Выбранное время физически переезжает в сводку — тот же чип, а не два
     разных. Замер делается в кадре, когда экран сводки уже нарисован. */
  useEffect(() => {
    const chip = fly.current;
    const frame = body.current;
    const source = pickTime.current;
    if (!chip || !frame || !source) return;

    if (!flying) {
      chip.style.opacity = '0';
      chip.style.transform = '';
      return;
    }

    const from = source.getBoundingClientRect();
    const base = frame.getBoundingClientRect();
    chip.style.left = `${from.left - base.left}px`;
    chip.style.top = `${from.top - base.top}px`;
    chip.style.width = `${from.width}px`;
    chip.style.transform = '';
    chip.style.opacity = '1';

    const move = requestAnimationFrame(() => {
      const target = slotTarget.current?.getBoundingClientRect();
      const now = chip.getBoundingClientRect();
      if (!target) return;
      const dx = target.left - now.left;
      const dy = target.top + target.height / 2 - (now.top + now.height / 2);
      chip.style.transform = `translate(${dx}px, ${dy}px) scale(.8)`;
    });

    return () => cancelAnimationFrame(move);
  }, [flying]);

  const screenClass = (index: number) =>
    ['cscreen', index === screen ? 'is-on' : '', index < screen ? 'is-out' : '']
      .filter(Boolean)
      .join(' ');

  const ctaLabel = screen === 3 ? t.bkConfirm : screen === 4 ? t.bkBooked : t.bkContinue;

  return (
    <section className="section client" id="clients" aria-labelledby="client-title">
      <div className="client__bg" aria-hidden="true">
        <Still src="/landing/cafe-booking.jpg" sizes="100vw" />
      </div>

      <div className="container client__grid">
        <div className="client__text">
          <div className="reveal">
            <p className="eyebrow" style={{ marginBottom: 20 }}>
              {t.clientEyebrow}
            </p>
            <h2 id="client-title">{t.clientTitle}</h2>
          </div>

          <ol className="client__steps reveal" style={{ '--delay': '100ms' } as CSSProperties}>
            {[t.clientStep1, t.clientStep2, t.clientStep3, t.clientStep4].map((label, index) => {
              const current = Math.min(screen, 3);
              return (
                <li
                  key={label}
                  className={[
                    'cstep',
                    index === current ? 'is-on' : '',
                    index < current ? 'is-done' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="cstep__n">{index + 1}</span>
                  <b>{label}</b>
                </li>
              );
            })}
          </ol>

          <div className="client__key reveal" style={{ '--delay': '160ms' } as CSSProperties}>
            <strong>{t.clientNoAccount}</strong>
            <p>{t.clientNoAccountBody}</p>
          </div>
        </div>

        <div
          className="client__stage reveal"
          style={{ '--delay': '120ms' } as CSSProperties}
          role="img"
          aria-label={t.clientFlowAlt}
          ref={stage}
        >
          <Phone>
            <div className="phone__screen">
              <PhoneStatus time="18:24" />

              <div className="phone__body" ref={body}>
                <div className={screenClass(0)}>
                  <p className="cscreen__back">Studio Nara</p>
                  <p className="cscreen__title">{t.clientAskService}</p>
                  <div className="svc">
                    {SERVICES.map(([name, minutes, price], index) => (
                      <div
                        key={name}
                        className={index === 1 && picked.has(0) ? 'svc__row is-on' : 'svc__row'}
                        ref={index === 1 ? pickService : undefined}
                      >
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

                <div className={screenClass(1)}>
                  <p className="cscreen__back">← Gel manicure</p>
                  <p className="cscreen__title">{t.clientAskWho}</p>
                  <div className="svc">
                    <div className="svc__row">
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span className="avatar avatar--paper">AN</span>
                        <div>
                          <div className="svc__name">{t.clientAnyone}</div>
                          <div className="svc__sub">{t.clientEarliest}</div>
                        </div>
                      </div>
                    </div>
                    <div className={picked.has(1) ? 'svc__row is-on' : 'svc__row'} ref={pickPerson}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span className="avatar">EO</span>
                        <div>
                          <div className="svc__name">Elīna Ozola</div>
                          <div className="svc__sub">{t.clientNailArtist6}</div>
                        </div>
                      </div>
                    </div>
                    <div className="svc__row">
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span className="avatar avatar--pink">MK</span>
                        <div>
                          <div className="svc__name">Marta Kalniņa</div>
                          <div className="svc__sub">{t.clientNailArtist3}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={screenClass(2)}>
                  <p className="cscreen__back">← Elīna · Gel manicure</p>
                  <p className="cscreen__title">{t.clientAskWhen}</p>
                  <div className="days" style={{ marginBottom: 12 }}>
                    {WEEK.map((day) => (
                      <span
                        key={day.date}
                        className={day.on ? 'day is-on' : day.off ? 'day is-off' : 'day'}
                      >
                        <small>{t[day.day]}</small>
                        {day.date}
                      </span>
                    ))}
                  </div>
                  <div className="times">
                    {TIMES.map((time) => (
                      <span
                        key={time}
                        ref={time === '14:30' ? pickTime : undefined}
                        className={[
                          'time',
                          TAKEN.has(time) ? 'is-off' : '',
                          time === '14:30' && picked.has(2) ? 'is-on' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {time}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={screenClass(3)}>
                  <p className="cscreen__back">← {t.demoSlotShort}</p>
                  <p className="cscreen__title">{t.clientAlmostDone}</p>
                  <div className="confirm__row" style={{ marginTop: 0 }}>
                    <b>Gel manicure · 75 {t.unitMin}</b>
                    <span>Elīna Ozola · Studio Nara</span>
                    <span>
                      {t.demoDayLong} ·{' '}
                      <span className="mono" ref={slotTarget}>
                        14:30
                      </span>
                    </span>
                  </div>
                  <div className="confirm__row">
                    <b>Laura</b>
                    <span>+371 2· ··· ···</span>
                  </div>
                </div>

                <div className={screenClass(4)}>
                  <div className="confirm" style={{ paddingTop: 60 }}>
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
                    <div className="confirm__meta">{t.demoSlotShort} · 14:30 · Elīna</div>
                  </div>
                </div>

                <span
                  className={tap ? 'tap is-on' : 'tap'}
                  key={tap?.nonce}
                  style={
                    { '--tx': `${tap?.x ?? 0}px`, '--ty': `${tap?.y ?? 0}px` } as CSSProperties
                  }
                />
                <span className="fly" ref={fly}>
                  14:30
                </span>
              </div>

              <div className="phone__foot">
                <div className="ui-btn ui-btn--pink ui-btn--block" ref={cta}>
                  {ctaLabel}
                </div>
              </div>
            </div>
          </Phone>
        </div>
      </div>
    </section>
  );
}
