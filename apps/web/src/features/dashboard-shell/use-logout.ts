'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

/**
 * Выход снимает куку на своём маршруте и уводит на вход.
 *
 * `router.refresh()` после перехода обязателен: серверные компоненты
 * кабинета уже отрисованы с прежней кукой, и без сброса кэша человек увидел
 * бы свой кабинет ещё раз — уже выйдя из него.
 *
 * Один хук на три места (карточка аккаунта, строки «Ещё» на телефоне,
 * «Выйти» внизу боковой панели): выход — одно действие, и вести себя оно
 * обязано одинаково, откуда бы ни нажали.
 */
export function useLogout() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const logout = useCallback(
    async (beforeLeave?: () => void) => {
      setLeaving(true);
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } finally {
        beforeLeave?.();
        router.push('/login');
        router.refresh();
      }
    },
    [router],
  );

  return { logout, leaving };
}
