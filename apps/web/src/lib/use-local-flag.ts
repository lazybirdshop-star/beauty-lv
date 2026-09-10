'use client';

import { useCallback, useSyncExternalStore } from 'react';

const CHANGED = 'amolie:local-flag';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    /* Приватный режим, запрет хранилища: флажок — удобство, не условие. */
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
 * Флажок этого браузера: «подсказку скрыли», «это уже видели».
 *
 * `null` — пока ответа нет: на сервере и в первом кадре гидратации хранилища
 * не видно. Вызывающий должен в этом состоянии ничего не показывать — иначе
 * скрытая однажды подсказка мигала бы на каждом заходе.
 */
export function useLocalFlag(key: string): [boolean | null, (value: boolean) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key) ?? '',
    () => null,
  );

  const set = useCallback(
    (value: boolean) => {
      try {
        if (value) window.localStorage.setItem(key, '1');
        else window.localStorage.removeItem(key);
      } catch {
        return;
      }
      window.dispatchEvent(new Event(CHANGED));
    },
    [key],
  );

  return [raw === null ? null : raw === '1', set];
}
