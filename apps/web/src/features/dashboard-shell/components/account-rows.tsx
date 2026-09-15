'use client';

import { useTheme } from 'next-themes';
import { useState, useSyncExternalStore } from 'react';

import { useT } from '@/lib/i18n';

import { Icon } from './icon';
import { LogoutDialog } from './logout-dialog';

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
 * пункта меню, — потому что вокруг них строки списка. Выход спрашивает
 * подтверждение поверх листа; лист закрывается, только когда человек уходит.
 */
export function AccountRows({ onDone }: { onDone: () => void }) {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const dark = resolvedTheme === 'dark';

  return (
    <>
      <button type="button" className="mrow" onClick={() => setTheme(dark ? 'light' : 'dark')}>
        <Icon name={mounted && dark ? 'sun' : 'moon'} className="ico-18" />
        <span>{mounted && dark ? t.common.themeLight : t.common.themeDark}</span>
      </button>

      <button type="button" className="mrow" onClick={() => setConfirmingLogout(true)}>
        <Icon name="logout" className="ico-18" />
        <span>{t.common.logout}</span>
      </button>

      <LogoutDialog
        open={confirmingLogout}
        onOpenChange={setConfirmingLogout}
        beforeLeave={onDone}
      />
    </>
  );
}
