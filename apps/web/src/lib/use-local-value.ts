'use client';

import { useCallback, useSyncExternalStore } from 'react';

const CHANGED = 'amolie:local-value';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    /* Приватный режим, запрет хранилища: значение — удобство, не условие. */
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/**
 * Строка этого браузера: «когда последний раз открывали ленту».
 *
 * Пара к `useLocalFlag`, когда нужно не «да/нет», а значение. `undefined` —
 * пока ответа нет (сервер и первый кадр гидратации): вызывающий в этом
 * состоянии ничего не показывает, иначе точка на колокольчике мигала бы на
 * каждом заходе. `null` — значение не записано.
 */
export function useLocalValue(key: string): [string | null | undefined, (value: string) => void] {
  const raw = useSyncExternalStore<string | null | undefined>(
    subscribe,
    () => read(key),
    () => undefined,
  );

  const set = useCallback(
    (value: string) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        return;
      }
      window.dispatchEvent(new Event(CHANGED));
    },
    [key],
  );

  return [raw, set];
}
