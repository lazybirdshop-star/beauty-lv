/* One screen, one block.
   Proximity snapping rather than mandatory: when the wheel stops, if the nearest
   block edge is close enough to be what the reader was aiming at, the page eases
   the rest of the way. Far from any edge — mid-way through a long block, reading
   — nothing happens, so the page never fights someone who is scrolling on
   purpose. Runs through Lenis; window.scrollTo would fight the smoothing.

   The pinned stage track owns its own rule and is skipped here. */
import { useEffect } from 'react';

import { getLenis } from '../lib/scroll';

/** How close a block edge has to be, as a share of the viewport, to pull. */
const PULL = 0.4;
/** Below this the page is already where it should be. */
const DEAD = 6;

export function useBlockSnap(skipSelector: string) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let timer = 0;
    let snapping = false;

    const points = () => {
      const found = [...document.querySelectorAll<HTMLElement>('[data-snap]')].map((el) =>
        Math.round(el.getBoundingClientRect().top + window.scrollY),
      );
      return found.sort((a, b) => a - b);
    };

    const skipRange = () => {
      const el = document.querySelector<HTMLElement>(skipSelector);
      if (!el) return null;
      const top = el.getBoundingClientRect().top + window.scrollY;
      return [top, top + el.offsetHeight - window.innerHeight] as const;
    };

    const settle = () => {
      const lenis = getLenis();
      if (!lenis || snapping) return;

      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (y < 4 || y > max - 4) return;

      const skip = skipRange();
      if (skip && y > skip[0] + 4 && y < skip[1] - 4) return;

      let best = Infinity;
      let target = y;
      for (const p of points()) {
        const d = Math.abs(p - y);
        if (d < best) {
          best = d;
          target = p;
        }
      }

      if (best < DEAD || best > window.innerHeight * PULL) return;

      snapping = true;
      lenis.scrollTo(target, {
        duration: 0.85,
        easing: (x: number) => 1 - Math.pow(1 - x, 3),
        onComplete: () => {
          snapping = false;
        },
      });
    };

    const onScroll = () => {
      if (snapping) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 150);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [skipSelector]);
}
