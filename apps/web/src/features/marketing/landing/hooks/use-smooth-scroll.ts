/* Lenis drives the scroll position and ScrollTrigger reads from it, so the
   phone's rotation resolves as one continuous movement instead of stepping
   with every wheel notch. Disabled outright when the reader asked for less
   motion — then the native scroll is left completely alone. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect } from 'react';

import { setLenis } from '../lib/scroll';

export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /* Регистрация внутри эффекта, а не на уровне модуля: клиентские
       компоненты Next рендерит и на сервере, где нет ни window, ни
       requestAnimationFrame, а плагин прокрутки там не нужен вовсе. */
    gsap.registerPlugin(ScrollTrigger);

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    /* Lenis тянет за собой всю свою механику; на сервере её грузить незачем,
       поэтому импорт динамический и живёт внутри эффекта. */
    void import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return;

      const lenis = new Lenis({
        duration: 1.05,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        touchMultiplier: 1.6,
      });
      setLenis(lenis);

      const onScroll = () => ScrollTrigger.update();
      lenis.on('scroll', onScroll);

      const raf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      // Anchors are handled by `useAnchorScroll`, which reads this instance out
      // of `lib/scroll` — it has to work with reduced motion too, where there is
      // no Lenis at all.

      cleanup = () => {
        lenis.off('scroll', onScroll);
        gsap.ticker.remove(raf);
        setLenis(null);
        lenis.destroy();
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
}
