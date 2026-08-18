/* Adapted from React Bits — Components/SpotlightCard (MIT, DavidHDev/react-bits).
   Same idea — the pointer writes its position into two custom properties and
   the paint is left to CSS — with the delegation moved up to the list, so three
   rows cost one listener instead of three, and with the light itself authored
   in the design system's accent rather than the original's white.

   It is a hook rather than a wrapper component because the rows here are `li`
   elements inside an `ol`; an extra div between them would break the list. */
import { useEffect, type RefObject } from 'react';

export function useSpotlight(ref: RefObject<HTMLElement | null>, itemSelector: string) {
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // A finger has no hover: on touch the light would land wherever the reader
    // last tapped and stay there.
    if (!window.matchMedia('(hover: hover)').matches) return;

    const onMove = (e: PointerEvent) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>(itemSelector);
      if (!item) return;
      const r = item.getBoundingClientRect();
      item.style.setProperty('--mx', `${e.clientX - r.left}px`);
      item.style.setProperty('--my', `${e.clientY - r.top}px`);
    };

    host.addEventListener('pointermove', onMove);
    return () => host.removeEventListener('pointermove', onMove);
  }, [ref, itemSelector]);
}
