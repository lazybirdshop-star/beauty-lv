'use client';

import { useSyncExternalStore } from 'react';

/** Порог телефона — тот же, что у CSS: ниже него боковой панели уже нет. */
const PHONE = '(max-width: 899px)';

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(PHONE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * Узкий ли экран — для тех решений, которые CSS принять не может.
 *
 * Почти всё различие телефона и большого экрана — вопрос оформления, и решает
 * его медиазапрос. Но «показать день вместо недели» меняет не вид, а данные:
 * колонок в сетке становится одна, и скрыть шесть остальных ничем нельзя —
 * они всё равно посчитаны и отрисованы.
 *
 * `useSyncExternalStore`, а не состояние с эффектом: на сервере ширины нет, и
 * серверный снимок честно отвечает «не узкий», а браузер поправляет его до
 * первой отрисовки. Состояние в эффекте дало бы лишний проход и мигание.
 */
export function useNarrow(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}
