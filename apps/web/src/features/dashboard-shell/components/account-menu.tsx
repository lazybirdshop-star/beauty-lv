'use client';

import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useSyncExternalStore } from 'react';

import { getMyAvatar } from '@/features/design-studio/api';
import { initials } from '@/lib/avatar';
import { useT } from '@/lib/i18n';

import { useLogout } from '../use-logout';
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
 * Карточка аккаунта — верх боковой панели (Design System V2, handoff §5).
 *
 * Портрет 44, имя, заведение; за шевроном — тема и выход. На `<details>`,
 * как и меню строки: элемент сам открывается и закрывается, работает с
 * клавиатуры и до гидратации, не тянет ни библиотеки, ни портала.
 */
export function AccountMenu({
  accountName,
  panelLabel,
  badge,
}: {
  accountName: string;
  panelLabel: string;
  /** Пометка ADMIN — только у панели платформы. */
  badge?: string;
}) {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const root = useRef<HTMLDetailsElement>(null);
  const { logout, leaving } = useLogout();
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
            {initials(accountName, 'A')}
          </span>
        )}
        <span className="account-card__text">
          <span className="account-card__name type-strong">
            {accountName}
            {badge ? <span className="account-card__badge">{badge}</span> : null}
          </span>
          <span className="type-meta account-card__hint">{panelLabel}</span>
        </span>
        <Icon name="chevD" className="ico-16 account-card__chev" />
      </summary>

      <div
        className="popover-surface account-menu__list"
        onClick={() => {
          if (root.current) root.current.open = false;
        }}
      >
        {/* Тема — здесь же: это свойство рабочего места, а не раздела, и
            искать её в настройках заведения человек не должен. */}
        <button type="button" className="menu-item" onClick={() => setTheme(dark ? 'light' : 'dark')}>
          <Icon name={mounted && dark ? 'sun' : 'moon'} className="ico-18" />
          <span>{mounted && dark ? t.common.themeLight : t.common.themeDark}</span>
        </button>

        <button type="button" className="menu-item" disabled={leaving} onClick={() => void logout()}>
          <Icon name="logout" className="ico-18" />
          <span>{leaving ? t.common.processing : t.common.logout}</span>
        </button>
      </div>
    </details>
  );
}
