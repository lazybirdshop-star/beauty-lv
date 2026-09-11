'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { getMyAvatar } from '@/features/design-studio/api';
import { useT } from '@/lib/i18n';

import { useWorkspace } from '../workspace-context';
import { Icon } from './icon';
import { MemberAvatar } from './member-avatar';

const noopSubscribe = () => () => {};

/**
 * Правда только после гидратации.
 *
 * Тему `next-themes` разрешает уже в браузере, и печатать «Тёмная тема» на
 * сервере значило бы обещать состояние, которого сервер не знает.
 */
function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Карточка аккаунта с меню — по артборду `Main.dc.html`, где у неё справа
 * стоит шеврон.
 *
 * До сих пор шеврон был нарисован, а меню за ним не было: выйти из кабинета
 * было нельзя вовсе, и единственным способом оставалось стереть куки руками.
 *
 * На `<details>`, как и меню строки: элемент сам открывается и закрывается,
 * работает с клавиатуры и до гидратации, не тянет ни библиотеки, ни портала.
 */
export function AccountMenu({
  accountName,
  panelLabel,
  initials,
}: {
  accountName: string;
  panelLabel: string;
  initials: string;
}) {
  const t = useT();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const root = useRef<HTMLDetailsElement>(null);
  const [leaving, setLeaving] = useState(false);
  /* Панель платформы тоже рисует эту карточку, но участника организации там
     нет — и запроса нет. Ключ общий с «Моим фото» в настройках. */
  const workspace = useWorkspace();
  const ownAvatar = useQuery({
    queryKey: ['member-avatar', workspace?.slug],
    queryFn: () => getMyAvatar(workspace!.slug),
    enabled: Boolean(workspace),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const node = root.current;
    if (!node) return;

    const close = (event: Event) => {
      if (!node.open) return;
      if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape') return;
      if (event.type === 'pointerdown' && node.contains(event.target as Node)) return;
      node.open = false;
    };

    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);

  const dark = resolvedTheme === 'dark';

  /*
   * Выход снимает куку на своём маршруте и уводит на вход.
   *
   * `router.refresh()` после перехода обязателен: серверные компоненты
   * кабинета уже отрисованы с прежней кукой, и без сброса кэша человек
   * увидел бы свой кабинет ещё раз — уже выйдя из него.
   */
  async function logout() {
    setLeaving(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <details className="account-menu" ref={root}>
      <summary className="account-card">
        {/* Своё лицо — если оно есть: карточка аккаунта показывает того же
            человека, что клиенты видят на странице записи. */}
        {ownAvatar.data?.avatar ? (
          <MemberAvatar
            className="account-card__avatar"
            name={accountName}
            seed={accountName}
            url={ownAvatar.data.avatar.url}
            focal={ownAvatar.data.avatar.focal}
          />
        ) : (
          <span className="avatar account-card__avatar" aria-hidden="true">
            {initials}
          </span>
        )}
        <span className="col" style={{ gap: 1, minWidth: 0, textAlign: 'left' }}>
          <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{accountName}</span>
          <span className="t-meta" style={{ fontSize: 11.5 }}>
            {panelLabel}
          </span>
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--muted-2)' }}>
          <Icon name="chevU" className="ico-16" />
        </span>
      </summary>

      <div
        className="row-menu__list account-menu__list"
        onClick={() => {
          if (root.current) root.current.open = false;
        }}
      >
        {/* Тема — здесь же: это свойство рабочего места, а не раздела, и
            искать её в настройках заведения человек не должен. */}
        <button type="button" onClick={() => setTheme(dark ? 'light' : 'dark')}>
          <Icon name={mounted && dark ? 'sun' : 'moon'} className="ico-18" />
          <span>{mounted && dark ? t.common.themeLight : t.common.themeDark}</span>
        </button>

        <button type="button" disabled={leaving} onClick={() => void logout()}>
          <Icon name="logout" className="ico-18" />
          <span>{leaving ? t.common.processing : t.common.logout}</span>
        </button>
      </div>
    </details>
  );
}
