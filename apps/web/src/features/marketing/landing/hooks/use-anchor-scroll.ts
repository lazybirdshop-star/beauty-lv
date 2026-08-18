/* Anchor navigation. Lives apart from the smoothing because it has a job to do
   whether or not Lenis is running: with reduced motion there is no Lenis, and
   the native jump would land on a section's top edge — which for the two
   animated blocks is the wrong place by most of a screen. */
import { useEffect } from 'react';

import { getLenis, resolvedScrollTarget } from '../lib/scroll';

export function useAnchorScroll() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;

      const link = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]');
      if (!(link instanceof HTMLAnchorElement)) return;

      const id = link.getAttribute('href')!.slice(1);
      const target = id && document.getElementById(id);
      if (!target) return;

      e.preventDefault();

      const lenis = getLenis();
      const resolved = resolvedScrollTarget(target);

      if (resolved !== null) {
        if (lenis) lenis.scrollTo(resolved, { duration: 1.2 });
        else window.scrollTo({ top: resolved });
        return;
      }

      if (lenis) lenis.scrollTo(target, { offset: -24 });
      else target.scrollIntoView();
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
