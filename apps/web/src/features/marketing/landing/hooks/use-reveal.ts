'use client';

import { useEffect } from 'react';

/** Класс на `<html>`, после которого стилевой слой прячет ещё не показанные блоки. */
const ARMED = 'reveal-armed';

/** Запас снизу, в пределах которого блок считается уже увиденным. */
const LOOKAHEAD = 0.12;

/**
 * Появление по скроллу.
 *
 * Один наблюдатель на всю страницу, а не компонент-обёртка вокруг каждого
 * блока: элементов с `.reveal` больше сорока, и сорок наблюдателей — это
 * сорок обратных вызовов на каждый кадр прокрутки на телефоне.
 *
 * До этого хука содержимое видно: прячет его только класс `reveal-armed`,
 * который ставится здесь. Блоки, уже стоящие в кадре на момент гидратации,
 * помечаются показанными до взвода — иначе читатель, открывший страницу
 * посередине или долиставший её до загрузки скрипта, увидел бы, как текст
 * гаснет и проявляется заново.
 *
 * Элемент, который уже показался, снимается с наблюдения: возвращать его в
 * прозрачность при обратной прокрутке нельзя — читатель, вернувшийся на
 * абзац вверх, увидел бы, как текст исчезает у него под курсором.
 *
 * При `prefers-reduced-motion` взвода нет вовсе: у отказа от анимации нет
 * промежуточного состояния, в котором текст невидим.
 */
export function useReveal(): void {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = document.documentElement;
    const horizon = window.innerHeight * (1 + LOOKAHEAD);
    const pending: HTMLElement[] = [];

    for (const node of document.querySelectorAll<HTMLElement>('.reveal')) {
      if (node.getBoundingClientRect().top < horizon) node.classList.add('is-in');
      else pending.push(node);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      },
      /* Появление начинается чуть раньше, чем блок въехал в экран: при
         быстрой прокрутке телефоном читатель не должен смотреть на пустой
         экран, пока текст дожидается своих восьми процентов видимости. */
      { rootMargin: `0px 0px ${LOOKAHEAD * 100}% 0px`, threshold: 0 },
    );

    for (const node of pending) observer.observe(node);
    root.classList.add(ARMED);

    return () => {
      observer.disconnect();
      root.classList.remove(ARMED);
    };
  }, []);
}
