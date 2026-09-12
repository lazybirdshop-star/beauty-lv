'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

import { useT } from '@/lib/i18n';

import { useLogout } from '../use-logout';
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
 * Тема и выход строками — для листа «Ещё» на телефоне.
 *
 * На телефоне боковой панели нет вовсе, а с ней нет и карточки аккаунта: без
 * этих двух строк выйти из кабинета с телефона было нельзя ни одним способом.
 *
 * Те же два действия, что и в меню карточки, но в форме строки списка, а не
 * пункта меню, — потому что вокруг них строки списка.
 */
export function AccountRows({ onDone }: { onDone: () => void }) {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const { logout, leaving } = useLogout();

  const dark = resolvedTheme === 'dark';

  return (
    <>
      <button type="button" className="mrow" onClick={() => setTheme(dark ? 'light' : 'dark')}>
        <Icon name={mounted && dark ? 'sun' : 'moon'} className="ico-18" />
        <span>{mounted && dark ? t.common.themeLight : t.common.themeDark}</span>
      </button>

      <button type="button" className="mrow" disabled={leaving} onClick={() => void logout(onDone)}>
        <Icon name="logout" className="ico-18" />
        <span>{leaving ? t.common.processing : t.common.logout}</span>
      </button>
    </>
  );
}
