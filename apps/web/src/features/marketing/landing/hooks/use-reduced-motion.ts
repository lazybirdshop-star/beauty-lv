'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/**
 * Отказ от анимации как значение, а не как ветка внутри эффекта.
 *
 * Сцены страницы (петля героя, телефон клиента, рост в салон) при отказе
 * показывают не «ничего», а итог: запись уже стоит в календаре, шаги уже
 * выбраны, колонок уже шесть. Считать это состояние в эффекте значило бы
 * отрисовать сначала пустой кадр и только потом итоговый — то есть выдать ту
 * самую анимацию, от которой человек отказался.
 *
 * `useSyncExternalStore` возвращает ответ уже на первой отрисовке в браузере
 * и `false` на сервере: разметка совпадает с той, что приезжает из HTML.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
