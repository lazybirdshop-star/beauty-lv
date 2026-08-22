/* The page's one signature interaction (AI-RULES MOT-04).
   The client's iPhone 16 Pro model lives in a fixed layer above the hero and the
   showcase, so it is never re-mounted between them. In the hero it stands still,
   tipped back, rising from below the fold. Scrolling on carries it up into its
   own section while it turns one full revolution about its vertical axis; as the
   screen comes back into view the four callouts arrive around it together.

   The WebGL scene itself is in phone-scene.ts — this component owns the framing,
   the scroll choreography and the snap. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { CALLOUTS } from '../lib/callouts';
import { STAGE_RESOLVED } from '../lib/marks';
import { prefetchModel } from '../lib/model-preload';
import { getLenis } from '../lib/scroll';
import { Photo } from './photo';
import type { PhoneScene } from './phone-scene';

const MODEL_URL = '/landing/models/iphone-16-pro.glb';

/* Тот же самый кадр, снятый с этой же сцены в позе героя
   (scripts/landing-device-poster.mjs). Пока читатель стоит на первом экране,
   устройство показывает он, а не WebGL. */
const POSTER_URL = '/landing/device-hero.png';

/* Two screens, swapped behind the reader's back — literally. The device shows
   the client-facing booking page until it turns away, and comes back round
   holding the master's own cabinet. The swap happens at exactly half a turn,
   when the glass is pointing away from the camera, so there is no cut to see. */
const SCREENS = ['/landing/screen-booking.jpg', '/landing/screen-cabinet.jpg'] as const;

/** The device has reached its showcase mark by here. */
const HANDOFF_END = 0.3;

/*
 * Где заканчивается оборот — и почему на широком экране позже.
 *
 * После того как выноски пришли, трек ещё не кончился, и весь его остаток
 * читатель проталкивает вхолостую: телефон сел, карточки стоят, секция держит
 * экран. Замерено по шагу прокрутки: на десктопе последнее изменение на 960px
 * из 1530 — 570px, две трети экрана, за которые не происходит ничего. На
 * трекпаде это несколько движений подряд впустую, и читается как подвисание.
 *
 * Хвост — это (1 − ARRIVE) от трека, поэтому укоротить его можно только
 * сдвинув хореографию вправо. На широком экране это ничего не стоит: все
 * четыре выноски стоят по углам и читаются разом, дочитывать нечего. На узком
 * они сменяют друг друга по одной, и разбег после прихода им нужен — там доли
 * остаются прежними, а хвост и без того вдвое короче (261px).
 */
const SPIN_END_WIDE = 0.9;
const SPIN_END_NARROW = 0.62;
/** Callouts land when the screen is back to ~45° off the reader. */
const ARRIVE_OF_SPIN = 0.875;
/** Narrow viewports show one callout at a time; this is the handover interval. */
const SOLO_STEP = 0.09;
/** Where the snap drops you: device seated, turn done, all four callouts read.
    Shared with the `Product` anchor, which has to land on the same pose. */
const SNAP_TARGET = STAGE_RESOLVED;

type MockupStageProps = { trackId: string };

export function MockupStage({ trackId }: MockupStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PhoneScene | null>(null);
  /** Last progress applied, so a late-arriving scene can be posed immediately. */
  const progressRef = useRef(0);
  const applyRef = useRef<(p: number) => void>(() => {});
  /** Доля трека, на которой приходят выноски; зависит от ширины окна. */
  const arriveRef = useRef(SPIN_END_WIDE * 0.875);
  const [loaded, setLoaded] = useState(false);

  /* Сцена строится не на загрузке страницы, а с первым движением читателя.

     three.js приезжает своим куском — он самый большой на странице, и тексту
     незачем ждать за ним. Но дело не только в весе: замеры показали, что
     построение сцены и первые её кадры держат главный поток около полутора
     секунд там, где WebGL считается на процессоре, — а именно так устроены
     машины, на которых меряют скорость страницы. Всё это время страница не
     отвечает на касания.

     Платить за это на первом экране не за что: в герое устройство по замыслу
     стоит неподвижно, и его роль там целиком исполняет постер. WebGL нужен к
     повороту, а поворот начинается только после того, как читатель тронул
     страницу вниз — тогда сцена и строится, с запасом в целый экран
     прокрутки, и подменяет собой постер по готовности. */
  useEffect(() => {
    const host = canvasRef.current;
    if (!host) return;
    let scene: PhoneScene | null = null;
    let cancelled = false;
    let started = false;

    const build = () => {
      import('./phone-scene')
        .then(({ createPhoneScene }) => {
          if (cancelled) return;
          scene = createPhoneScene(host, MODEL_URL, [[...SCREENS]]);
          sceneRef.current = scene;
          return scene.ready.then(() => {
            if (cancelled) return;
            // The scene missed every apply() that ran while it was loading, so
            // it would otherwise sit at its default pose until the next scroll.
            applyRef.current(progressRef.current);
            setLoaded(true);
          });
        })
        .catch(() => setLoaded(false)); // no WebGL: the page reads fine without it
    };

    /* Любой знак того, что читатель тронулся с места. `wheel` и `touchstart`
       приходят раньше самой прокрутки, `keydown` закрывает клавиатуру, а
       `scroll` — восстановленную позицию и переходы по якорю. */
    const INTENT = ['scroll', 'wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    const start = () => {
      if (started || cancelled) return;
      started = true;
      INTENT.forEach((type) => window.removeEventListener(type, start));
      build();
    };

    if (window.scrollY > 0) start();
    else INTENT.forEach((type) => window.addEventListener(type, start, { passive: true }));

    /* Байты модели — заранее, в простое после `load`.

       Без этого читатель, тронувший страницу, ждал сцену несколько секунд:
       614 КБ по мобильной сети приходят долго, и всё это время устройство
       стоит постером и не отзывается на прокрутку. Здесь берётся только
       сеть — разбор и построение по-прежнему ждут первого движения, поэтому
       главный поток на загрузке остаётся свободным. */
    let idle = 0;
    const warm = () => {
      if (cancelled) return;
      const later =
        window.requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(cb, 900));
      idle = later(() => !cancelled && prefetchModel(MODEL_URL), { timeout: 2500 }) as number;
    };
    if (document.readyState === 'complete') warm();
    else window.addEventListener('load', warm, { once: true });

    return () => {
      cancelled = true;
      INTENT.forEach((type) => window.removeEventListener(type, start));
      window.removeEventListener('load', warm);
      if (idle) (window.cancelIdleCallback ?? window.clearTimeout)(idle);
      scene?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const track = document.getElementById(trackId);
    const stage = stageRef.current;
    const rig = rigRef.current;
    if (!track || !stage || !rig) return;

    gsap.registerPlugin(ScrollTrigger);

    /* Обвязка мобильного браузера не считается изменением размера окна.

       Раскладка трека набрана в `svh` — она про видимую часть экрана и от
       уезжающей адресной строки не зависит. `window.innerHeight`, из которого
       ScrollTrigger считает границы, зависит: на прокрутке вниз строка
       прячется, окно вырастает на десяток процентов, триггер пересчитывается —
       и прогресс, а с ним и поза устройства, меняются скачком посреди
       движения. На резком возврате вверх строка выезжает обратно, и скачок
       повторяется зеркально. Здесь ScrollTrigger получает то же правило, по
       которому живёт вёрстка: вертикальный размер окна на телефоне менять
       границы не вправе. */
    ScrollTrigger.config({ ignoreMobileResize: true });

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      const setY = gsap.quickSetter(rig, 'yPercent');
      // scaleX/scaleY rather than the shorthand: a quickSetter on 'scale' writes
      // the CSS scale property, which GSAP itself blanks the moment it takes
      // over this element's transform — the write lands and does nothing.
      const setScaleX = gsap.quickSetter(rig, 'scaleX');
      const setScaleY = gsap.quickSetter(rig, 'scaleY');
      const setScale = (v: number) => {
        setScaleX(v);
        setScaleY(v);
      };
      /* Past the track the stage cannot scroll away on its own — it is fixed.
         The carry trigger below translates it instead, so it needs no fade. */
      const setStageY = gsap.quickSetter(stage, 'y', 'px');
      // The cards are rendered by the showcase section now, so they scroll away
      // with it; the stage only drives their timing. Queried off the document
      // rather than through gsap.utils.toArray: a gsap.context scopes every
      // selector string to its own element, and these no longer live inside it.
      const callouts = Array.from(document.querySelectorAll<HTMLElement>('.callout'));

      // Hero: dropped below the fold, tipped back, dead still.
      // Showcase: lifted clear of the heading, whole device in frame, drifting.
      const narrow = () => window.innerWidth < 860;
      const heroPose = () => (narrow() ? { y: 51, scale: 1 } : { y: 37, scale: 0.94 });
      /* Narrow: smaller and seated lower than it used to be. At 0.8/-3 the top
         of the glass landed within 6px of the heading's last line, and anywhere
         before the pose settled it crossed it outright. */
      const showPose = () => (narrow() ? { y: 3, scale: 0.72 } : { y: 3, scale: 0.9 });

      const TILT_HERO = -0.3;
      const TILT_SHOW = -0.05;
      const ROLL_HERO = 0.07;

      const ease = gsap.parseEase('power2.inOut');
      const spinEase = gsap.parseEase('power1.inOut');

      const apply = (p: number) => {
        progressRef.current = p;

        /* Считается на каждом кадре, а не один раз: `narrow()` смотрит на
           ширину окна, и поворот экрана обязан пересобрать хореографию. */
        const solo = narrow();
        const spinEnd = solo ? SPIN_END_NARROW : SPIN_END_WIDE;
        const arrive = spinEnd * ARRIVE_OF_SPIN;

        const t = ease(gsap.utils.clamp(0, 1, p / HANDOFF_END));
        const from = heroPose();
        const to = showPose();
        setY(gsap.utils.interpolate(from.y, to.y, t));
        setScale(gsap.utils.interpolate(from.scale, to.scale, t));

        const scene = sceneRef.current;
        if (scene) {
          const spin = reduced ? 0 : spinEase(gsap.utils.clamp(0, 1, p / spinEnd));
          scene.setSpin(0, spin);
          scene.setTilt(
            0,
            gsap.utils.interpolate(TILT_HERO, TILT_SHOW, t),
            gsap.utils.interpolate(ROLL_HERO, 0, t),
          );
          // Dead still in the hero — the drift belongs to the showcase, where
          // the device is the thing being looked at.
          scene.setIdle(reduced ? 0 : t);
          // Half a turn in, the glass is facing away — the only moment the
          // screen can be exchanged without the reader seeing it happen.
          scene.setScreen(0, spin < 0.5 ? 0 : 1);
        }

        // Presence is a switch, not a scrub: the cards run their own 620ms
        // entrance once the threshold is crossed. Tying opacity straight to
        // scroll position leaves them stranded half-faded wherever you stop.
        const active = Math.min(
          CALLOUTS.length - 1,
          Math.max(0, Math.floor((p - arrive) / SOLO_STEP)),
        );
        callouts.forEach((el, i) => {
          const shown = reduced || (p >= arrive && (!solo || i === active));
          el.classList.toggle('is-in', shown);
        });

        arriveRef.current = arrive;
      };
      applyRef.current = apply;

      const st = ScrollTrigger.create({
        trigger: track,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          apply(self.progress);
          queueSnap(self.progress, self.direction);
        },
        onRefresh: (self) => apply(self.progress),
      });

      /* The phone never disappears: once the track's bottom edge passes the
         viewport's bottom, the whole stage is carried upward at exactly the
         scroll rate, so the device leaves the way the section leaves — by
         scrolling off with it, background glow included. */
      ScrollTrigger.create({
        trigger: track,
        start: 'bottom bottom',
        end: 'bottom top',
        /* Путь берётся у самого триггера, а не у окна. Расстояние здесь по
           определению равно высоте видимой части — но `window.innerHeight`
           отвечает на этот вопрос своим числом, и в момент, когда они
           расходятся (обвязка браузера, зум страницы), сцена едет быстрее или
           медленнее прокрутки и отрывается от секции. `end - start` — ровно
           тот путь, по которому триггер считает свой прогресс, поэтому эти
           двое разойтись не могут. */
        onUpdate: (self) => setStageY(-self.progress * (self.end - self.start)),
        onRefresh: (self) => setStageY(-self.progress * (self.end - self.start)),
      });

      /* A nudge down out of the hero should land on the callouts rather than
         stranding the reader in the turn. Fires only downwards, only from inside
         the dead stretch, and only once the wheel has actually stopped. */
      let snapTimer = 0;
      let snapping = false;

      // ?nosnap lets the screenshot harness park at intermediate scroll
      // positions that the snap would otherwise pull it straight out of.
      const snapOff = reduced || new URLSearchParams(location.search).has('nosnap');

      const queueSnap = (p: number, direction: number) => {
        if (snapOff || snapping) return;
        window.clearTimeout(snapTimer);
        if (direction < 0 || p <= 0.015 || p >= arriveRef.current) return;
        snapTimer = window.setTimeout(() => {
          const lenis = getLenis();
          if (!lenis) return;
          const target = st.start + (st.end - st.start) * SNAP_TARGET;
          snapping = true;
          lenis.scrollTo(target, {
            duration: 1,
            easing: (x: number) => 1 - Math.pow(1 - x, 3),
            onComplete: () => {
              snapping = false;
            },
          });
        }, 140);
      };

      return () => window.clearTimeout(snapTimer);
    }, stageRef);

    return () => ctx.revert();
  }, [trackId]);

  return (
    <div className="stage" ref={stageRef}>
      <div className="stage__glow" aria-hidden="true" />

      <div className="stage__rig" ref={rigRef}>
        <div className="stage__float">
          {/* Снимается разом, без перехода. Кросс-фейд здесь только вредил:
              пока постер гас, он ещё стоял поверх ожившей сцены — а поза у
              него одна, снятая в начале трека. Стоит читателю тронуть
              страницу, и это уже две разные позы: следом за устройством
              полсекунды тянулся его же двойник. В начале трека постер и
              сцена совпадают попиксельно, так что мгновенная подмена там не
              видна вовсе, а дальше — единственная честная. */}
          <Photo
            className={`stage__poster${loaded ? ' is-spent' : ''}`}
            src={POSTER_URL}
            sizes="(max-width: 980px) 62vh, 500px"
            priority
          />
          <div
            className={`stage__canvas${loaded ? ' is-loaded' : ''}`}
            ref={canvasRef}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
