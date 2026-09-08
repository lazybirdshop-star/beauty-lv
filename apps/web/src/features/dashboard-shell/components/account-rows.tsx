'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState, useSyncExternalStore } from 'react';

import { useT } from '@/lib/i18n';

import { Icon } from './icon';

const noopSubscribe = () => () => {};

function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Тема и выход строками — для шторки «Ещё» на телефоне.
 *
 * На телефоне боковой панели нет вовсе, а с ней нет и карточки аккаунта: без
 * этих двух строк выйти из кабинета с телефона было нельзя ни одним способом.
 *
 * Те же две строки, что и в меню карточки, но в форме строки списка, а не
 * пункта меню, — потому что вокруг них строки списка.
 */
export function AccountRows({ onDone }: { onDone: () => void }) {
  const t = useT();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const [leaving, setLeaving] = useState(false);

  const dark = resolvedTheme === 'dark';

  async function logout() {
    setLeaving(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      onDone();
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <>
      <button type="button" className="mrow" onClick={() => setTheme(dark ? 'light' : 'dark')}>
        <Icon name={mounted && dark ? 'sun' : 'moon'} className="ico-18" />
        <span>{mounted && dark ? t.common.themeLight : t.common.themeDark}</span>
      </button>

      <button type="button" className="mrow" disabled={leaving} onClick={() => void logout()}>
        <Icon name="logout" className="ico-18" />
        <span>{leaving ? t.common.processing : t.common.logout}</span>
      </button>
    </>
  );
}
