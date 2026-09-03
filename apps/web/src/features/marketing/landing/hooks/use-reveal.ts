'use client';

import { useEffect } from 'react';

/**
 * Появление по скроллу.
 *
 * Один наблюдатель на всю страницу, а не компонент-обёртка вокруг каждого
 * блока: элементов с `.reveal` больше сорока, и сорок наблюдателей — это
 * сорок обратных вызовов на каждый кадр прокрутки на телефоне.
 *
 * Элемент, который уже показался, снимается с наблюдения: возвращать его в
 * прозрачность при обратной прокрутке нельзя — читатель, вернувшийся на
 * абзац вверх, увидел бы, как текст исчезает у него под курсором.
 *
 * При `prefers-reduced-motion` всё показано сразу: у отказа от анимации нет
 * промежуточного состояния, в котором текст невидим.
 */
export function useReveal(): void {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      for (const node of nodes) node.classList.add('is-in');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);
}
