'use client';

import { useEffect, useState, type RefObject } from 'react';

import { useReducedMotion } from './use-reduced-motion';

/**
 * Прогресс прокрутки внутри липкой сцены, записанный в `--p` на самом
 * элементе.
 *
 * Свойство, а не состояние React: значение меняется каждый кадр прокрутки, и
 * `setState` на каждом кадре перерисовывал бы поддерево из полусотни узлов
 * ради одного числа. CSS читает `--p` сам.
 *
 * Прокрутку никто не перехватывает — сцена только смотрит, где страница
 * находится, и ничего ей не навязывает.
 */
export function useSceneProgress(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) {
        node.style.setProperty('--p', '1');
        return;
      }
      const p = Math.min(1, Math.max(0, -rect.top / travel));
      node.style.setProperty('--p', p.toFixed(4));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref]);
}

/**
 * Очень мелкий параллакс сцены первого экрана: `--py` от −0.5 до 0.5.
 * Слои внутри умножают его на свой коэффициент, поэтому телефон и календарь
 * расходятся, а не едут вместе.
 */
export function useParallax(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const raw = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      node.style.setProperty('--py', (Math.min(1, Math.max(0, raw)) - 0.5).toFixed(3));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [ref]);
}

/**
 * Сцена роста: один стул → три → шесть.
 *
 * На большом экране этап выбирает прокрутка внутри липкого блока; на
 * телефоне липкой сцены нет (её нечем прокручивать, блок помещается в экран
 * целиком), и календарь разворачивается один раз, когда доезжает до глаз.
 * При отказе от анимации показан итог — шесть колонок.
 */
export function useGrowthStage(ref: RefObject<HTMLElement | null>): 1 | 3 | 6 {
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState<1 | 3 | 6>(1);

  useEffect(() => {
    const node = ref.current;
    if (!node || reduced) return;

    const sticky = window.matchMedia('(min-width: 961px) and (min-height: 821px)');

    if (!sticky.matches) {
      const timers: ReturnType<typeof setTimeout>[] = [];
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries[0]?.isIntersecting) return;
          observer.disconnect();
          timers.push(
            setTimeout(() => setScrolled(3), 700),
            setTimeout(() => setScrolled(6), 1700),
          );
        },
        { threshold: 0.4 },
      );
      observer.observe(node);
      return () => {
        observer.disconnect();
        for (const timer of timers) clearTimeout(timer);
      };
    }

    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / travel));
      setScrolled(p < 0.36 ? 1 : p < 0.68 ? 3 : 6);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref, reduced]);

  /* При отказе от анимации показан итог, а не первый кадр: шесть колонок —
     и есть то, что секция обязана сказать. */
  return reduced ? 6 : scrolled;
}
