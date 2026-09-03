'use client';

import { useEffect } from 'react';

/**
 * Кнопка, которая слегка тянется к курсору.
 *
 * Только для мыши и только когда анимация разрешена: на сенсорном экране
 * указателя нет, а «прилипание» под пальцем читается как промах по кнопке.
 *
 * Один слушатель на страницу вместо обработчика на каждой из семи кнопок:
 * `pointermove` приходит десятками раз в секунду, и семь замыканий на нём —
 * это работа, которую видно в профайлере на телефоне среднего класса.
 */
export function useMagnetic(): void {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;

    const STRENGTH = 0.22;

    const onMove = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-magnetic]');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const x = (event.clientX - (rect.left + rect.width / 2)) * STRENGTH;
      const y = (event.clientY - (rect.top + rect.height / 2)) * STRENGTH;
      target.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    };

    const onLeave = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-magnetic]');
      if (target) target.style.transform = '';
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onLeave, { passive: true });

    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onLeave);
    };
  }, []);
}
