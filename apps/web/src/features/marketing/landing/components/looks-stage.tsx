/* One page, three looks.
   The block opens on a single device standing in the middle. As the section
   takes the screen, two more slide out from behind it — one to each side, each
   holding a different theme of the same booking page. They come out of the
   middle device rather than fading in beside it, because the point being made
   is that this is one page wearing three faces, not three pages. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { FAN_SPAN, FAN_START } from '../lib/marks';
import type { PhoneScene } from './phone-scene';

const MODEL_URL = '/landing/models/iphone-16-pro.glb';

/** Centre first: it is the one already on screen when the block arrives. */
const LOOKS = [
  '/landing/theme-clean.jpg',
  '/landing/theme-neon.jpg',
  '/landing/theme-editorial.jpg',
] as const;

/** Metres. The model is 72mm wide, so this is a little over one device apart.
    It is the widest the fan ever opens; a narrow canvas opens it less (see
    `spreadFor`), because the three devices have to land inside the frame. */
const SPREAD = 0.092;
/** The pair slides out *behind* the middle device, not across it. */
const DEPTH = -0.045;
/** Held between the pair and the middle device at every point of the opening,
    including the closed state where all three sit on the same spot. Without it
    the three are coplanar, the depth buffer picks a winner arbitrarily, and the
    block opens on whichever theme won rather than on the one that is about to
    stand in the middle. 3mm is far below what the perspective can show. */
const BEHIND = -0.003;

/** How far off centre the pair can stand and still be read whole.
    `projectX` reports where a world x lands across the canvas, so the fan is
    measured in the canvas the reader actually has rather than in metres that
    only suit a wide one: the side devices are asked for 21% and 79%, and on a
    desktop canvas that request is wider than SPREAD, so the tuned value holds. */
function spreadFor(scene: PhoneScene): number {
  const unit = scene.projectX(1) - 0.5;
  if (!unit || !Number.isFinite(unit)) return SPREAD;
  const halfView = 0.5 / unit;
  return Math.min(SPREAD, halfView * 0.58);
}

type LooksStageProps = { sectionId: string };

export function LooksStage({ sectionId }: LooksStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PhoneScene | null>(null);
  const progressRef = useRef(0);
  const applyRef = useRef<(p: number) => void>(() => {});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const host = canvasRef.current;
    if (!host) return;
    let scene: PhoneScene | null = null;
    let cancelled = false;

    const start = () => {
      import('./phone-scene')
        .then(({ createPhoneScene }) => {
          if (cancelled) return;
          // Three devices side by side need the camera further back than one
          // does, and a narrow viewport further back still or they overlap.
          const fill = window.innerWidth < 860 ? 0.42 : 0.86;
          scene = createPhoneScene(
            host,
            MODEL_URL,
            LOOKS.map((src) => [src]),
            { fill },
          );
          sceneRef.current = scene;
          return scene.ready.then(() => {
            if (cancelled) return;
            applyRef.current(progressRef.current);
            setLoaded(true);
          });
        })
        .catch(() => setLoaded(false));
    };

    /* Built when the block comes within a screen of the reader, not at first
       paint. A second WebGL context is not free even with nothing to draw in it:
       measured over a full-page scroll at 4x CPU throttle, carrying both from
       load cost 58ms at the 90th percentile and janked one frame in five, while
       building this one late held the 90th at 10ms and one in twenty.

       The build itself is a single blocking task — a context, an environment
       map and three textures — so it is a visible hitch wherever it lands.
       Landing it here, once, buys every frame before it. Trying to hide it in an
       idle slice was measured too: there is no gap big enough, and building at
       load to use the real idle there simply brings back the cost it was
       supposed to avoid. */
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        start();
      },
      { rootMargin: '100% 0px' },
    );
    io.observe(host);

    return () => {
      cancelled = true;
      io.disconnect();
      scene?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const section = document.getElementById(sectionId);
    const host = hostRef.current;
    if (!section || !host) return;

    gsap.registerPlugin(ScrollTrigger);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* Narrow canvases frame the fan small enough that one device alone looks
       lost in the frame. It arrives at the size a single device wants and gives
       the width back as the other two come out — which is also the sentence the
       block is making. On a wide canvas one device already fills the frame, so
       there is nothing to give back and the scale stays at 1 throughout. */
    const narrow = window.matchMedia('(max-width: 860px)');

    const ctx = gsap.context(() => {
      const openEase = gsap.parseEase('power3.out');

      const apply = (p: number) => {
        progressRef.current = p;
        const scene = sceneRef.current;

        // The first half of the block belongs to the threads panel scrolling
        // off above; the fan opens once the frame underneath is fully clear,
        // then holds for the rest of the pin.
        const open = reduced ? 1 : openEase(gsap.utils.clamp(0, 1, (p - FAN_START) / FAN_SPAN));

        if (scene) {
          const spread = spreadFor(scene);
          const scale = narrow.matches ? 1 + 0.32 * (1 - open) : 1;
          scene.setPose(0, { x: 0, y: 0, z: 0, yaw: 0, scale });
          scene.setPose(1, {
            x: -spread * open,
            y: 0,
            z: BEHIND + DEPTH * open,
            yaw: 0.34 * open,
            scale,
          });
          scene.setPose(2, {
            x: spread * open,
            y: 0,
            z: BEHIND + DEPTH * open,
            yaw: -0.34 * open,
            scale,
          });
          for (let i = 0; i < LOOKS.length; i++) scene.setTilt(i, -0.05, 0);
          scene.setIdle(reduced ? 0 : open);
        }
      };
      applyRef.current = apply;

      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => apply(self.progress),
        onRefresh: (self) => apply(self.progress),
      });
    }, hostRef);

    return () => ctx.revert();
  }, [sectionId]);

  return (
    <div className="looks__stage" ref={hostRef}>
      <div
        className={`looks__canvas${loaded ? ' is-loaded' : ''}`}
        ref={canvasRef}
        aria-hidden="true"
      />
    </div>
  );
}
