'use client';

/* Обе стороны сразу — единственный светлый блок страницы и единственное
 * место, где продукт показан в движении.
 *
 * Герой и витрина показывают состояния: вот прибор, вот его экран. Здесь
 * идёт ход — клиент листает страницу, выбирает услугу, выбирает время,
 * отправляет, — и ровно в этот момент у мастера на заблокированном экране
 * всплывает уведомление, свайп поднимает его, открываются «Записи». Кадры
 * внутри те, которых на странице больше нет нигде: календарь, ряд времени,
 * форма. Без них блок пересказывал бы первый экран, где те же два экрана
 * уже показаны неподвижно.
 *
 * Экран блокировки, указатель и плашка уведомления собраны разметкой: чужую
 * операционную систему снять нельзя, а запечь её в снимок — значит
 * заморозить ровно то, что должно двигаться. Текст плашки при этом берётся
 * из того же формата, которым продукт шлёт пуш на самом деле.
 *
 * На узком экране два телефона рядом нечитаемы, а стопкой теряется весь
 * смысл блока — «обе стороны сразу». Поэтому там диптих превращается в один
 * кадр, который в нужную секунду переходит с одной стороны на другую: это
 * не два экрана, а один рассказ, и склейка приходится ровно на тот момент,
 * о котором блок и говорит.
 */
import type { Messages } from '@/lib/i18n/messages';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { BEATS, createFlowPlayer, LIFT_MS, TAPS, type FlowBeat } from '../components/flow-player';
import { Photo } from '../components/photo';
import { Reveal } from '../components/reveal';
import { nb } from '../lib/typo';

const CLIENT_FRAMES = [
  '/landing/flow/client-1-page.jpg',
  '/landing/flow/client-2-service.jpg',
  '/landing/flow/client-3-time.jpg',
  '/landing/flow/client-4-done.jpg',
] as const;

/** Куда ведёт нажатие на уведомление — «Записи», как и в настоящем пуше. */
const MASTER_FRAME = '/landing/flow/master-bookings.jpg';

/** Такт, на котором замирает читатель с выключенной анимацией. */
const RESOLVED = BEATS[BEATS.length - 1]!;

export function Minute({ t }: { t: Messages['marketing'] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [beat, setBeat] = useState<FlowBeat>(RESOLVED);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    /* Меньше движения — значит никакого: ход стоит на развязке, где всё уже
       случилось. Кадры те же, читатель ничего не теряет. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const player = createFlowPlayer((next) => setBeat(next));

    const io = new IntersectionObserver(
      ([entry]) => (entry?.isIntersecting ? player.start() : player.stop()),
      { threshold: 0.25 },
    );
    io.observe(stage);

    const onHidden = () => document.hidden && player.stop();
    document.addEventListener('visibilitychange', onHidden);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onHidden);
      player.dispose();
    };
  }, []);

  const tap = beat.tap >= 0 ? TAPS[beat.tap] : null;

  /* Палец не едет по стеклу, а отрывается: на время переноса он гаснет и
     уменьшается, на месте снова наливается и жмёт.
     Класс вешается прямо на узел, а не через состояние: это два кадра
     оформления, и гонять ради них перерисовку поддерева незачем — тот же
     довод, по которому вне React живёт и само расписание. */
  const tapRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = tapRef.current;
    if (!node || beat.tap < 0) return;
    node.classList.add('is-lifted');
    const t = window.setTimeout(() => node.classList.remove('is-lifted'), LIFT_MS);
    return () => window.clearTimeout(t);
  }, [beat.tap]);

  return (
    <section className="section minute" id="minute">
      <Reveal className="shell minute__inner" as="div">
        <div className="minute__head">
          <p className="label rise">{t.minuteLabel}</p>
          <h2 className="h2 minute__title rise" style={{ '--d': '100ms' } as CSSProperties}>
            {t.minuteTitleA}
            <br />
            {t.minuteTitleB}
          </h2>
          <p className="lede minute__lede rise" style={{ '--d': '200ms' } as CSSProperties}>
            {nb(t.minuteBody)}
          </p>
        </div>

        <div className="minute__pair" ref={stageRef} data-side={beat.side}>
          {/* ── сторона клиента ─────────────────────────────────────── */}
          <figure
            className="minute__screen rise"
            data-side="client"
            style={{ '--d': '300ms' } as CSSProperties}
          >
            <div className="minute__shot">
              {CLIENT_FRAMES.map((src, i) => (
                <div key={src} className={`flow__frame${i === beat.client ? ' is-on' : ''}`}>
                  <Photo
                    src={src}
                    alt={i === beat.client ? t.minuteClientAlt : ''}
                    sizes="(max-width: 860px) 76vw, 300px"
                  />
                </div>
              ))}

              {/* Палец. Точки сняты с настоящих нажатий тем же сценарием,
                  который делал кадры, — иначе указатель разъехался бы со
                  снимком на первой же правке страницы записи. */}
              <span
                aria-hidden="true"
                ref={tapRef}
                className={`flow__tap${tap ? ' is-on' : ''}`}
                style={
                  tap
                    ? ({ left: `${tap.x * 100}%`, top: `${tap.y * 100}%` } as CSSProperties)
                    : undefined
                }
              />
            </div>
            <figcaption className="minute__caption">{t.minuteClient}</figcaption>
          </figure>

          {/* ── сторона мастера ─────────────────────────────────────── */}
          <figure
            className="minute__screen rise"
            data-side="master"
            style={{ '--d': '400ms' } as CSSProperties}
          >
            <div className="minute__shot minute__shot--phone">
              {/* Экран блокировки: часы, дата и плашка уведомления. */}
              <div className={`flow__lock${beat.master === 'lock' ? ' is-on' : ''}`}>
                <p className="flow__lock-time num">{t.lockTime}</p>
                <p className="flow__lock-date">{t.lockDate}</p>

                <div className={`flow__push${beat.push ? ' is-on' : ''}`}>
                  <span className="flow__push-mark" aria-hidden="true">
                    A
                  </span>
                  <span className="flow__push-copy">
                    <span className="flow__push-title">{t.pushTitle}</span>
                    <span className="flow__push-body">{t.pushBody}</span>
                  </span>
                </div>

                {/* Подсказка свайпа — та же полоска, которой её показывает сам
                    телефон, и стрелка над ней. */}
                <span className={`flow__swipe${beat.swipe ? ' is-on' : ''}`} aria-hidden="true">
                  <span className="flow__swipe-bar" />
                </span>
              </div>

              {/* Кабинет поднимается снизу — так свайп и открывает приложение. */}
              <div
                className={`flow__frame flow__frame--rise${beat.master === 'open' ? ' is-on' : ''}`}
              >
                <Photo
                  src={MASTER_FRAME}
                  alt={beat.master === 'open' ? t.minuteMasterAlt : ''}
                  sizes="(max-width: 860px) 76vw, 300px"
                />
              </div>
            </div>
            <figcaption className="minute__caption">{t.minuteMaster}</figcaption>
          </figure>
        </div>
      </Reveal>
    </section>
  );
}
