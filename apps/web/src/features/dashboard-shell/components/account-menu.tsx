'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { getMyAvatar } from '@/features/design-studio/api';
import { COMPANY } from '@/features/legal/company';
import { initials } from '@/lib/avatar';
import { useT } from '@/lib/i18n';

import { useWorkspace } from '../workspace-context';
import { Icon } from './icon';
import { LogoutDialog } from './logout-dialog';
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
 * Карточка аккаунта — нижний край боковой панели (прототип «Кабинет 2026»,
 * блок `.rail-foot .me`).
 *
 * Портрет, имя, роль. Шеврона нет: карточка одна в своём углу, и стрелка
 * подсказывала бы то, что и так очевидно по нажатию. За карточкой — тема и
 * выход. На `<details>`, как и меню строки: элемент сам открывается и
 * закрывается, работает с клавиатуры и до гидратации, не тянет ни библиотеки,
 * ни портала.
 */
export function AccountMenu({
  accountName,
  panelLabel,
  badge,
  placement = 'down',
}: {
  accountName: string;
  panelLabel: string;
  /** Пометка ADMIN — только у панели платформы. */
  badge?: string;
  /** Куда раскрывается список: у нижнего края панели — вверх. */
  placement?: 'up' | 'down';
}) {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const root = useRef<HTMLDetailsElement>(null);
  /* Выход спрашивает подтверждение: окно живёт рядом с меню, а не внутри
     него — меню закрывается по нажатию, а вопрос должен остаться. */
  const [confirmingLogout, setConfirmingLogout] = useState(false);
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
  /* Настройки у платформы свои; участника организации там нет вовсе. */
  const settingsHref = workspace ? `/${workspace.slug}/dashboard/settings` : '/admin/settings';

  return (
    <>
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
        </summary>

        <div
          className={
            placement === 'up'
              ? 'popover-surface account-menu__list account-menu__list--up'
              : 'popover-surface account-menu__list'
          }
          onClick={() => {
            if (root.current) root.current.open = false;
          }}
        >
          {/* Шапка меню — кто вошёл и кем: карточку могли открыть, чтобы
            убедиться именно в этом. */}
          <div className="menu-head">
            {accountName} · {panelLabel}
          </div>

          <Link href={settingsHref} className="menu-item">
            <Icon name="settings" className="ico-18" />
            <span>{t.nav.settings}</span>
          </Link>

          {/* Тема — здесь же: это свойство рабочего места, а не раздела, и
            искать её в настройках заведения человек не должен. */}
          <button
            type="button"
            className="menu-item"
            onClick={() => setTheme(dark ? 'light' : 'dark')}
          >
            <Icon name={mounted && dark ? 'sun' : 'moon'} className="ico-18" />
            <span>{mounted && dark ? t.common.themeLight : t.common.themeDark}</span>
          </button>

          {/* «Помощь» ведёт в почту поддержки, а не на страницу справки:
            страницы справки у продукта нет, и пункт, открывающий пустоту,
            хуже, чем его отсутствие. */}
          <a className="menu-item" href={`mailto:${COMPANY.email.support}`}>
            <Icon name="help" className="ico-18" />
            <span>{t.nav.help}</span>
          </a>

          <hr className="rule menu-sep" role="separator" />

          <button type="button" className="menu-item" onClick={() => setConfirmingLogout(true)}>
            <Icon name="logout" className="ico-18" />
            <span>{t.common.logout}</span>
          </button>
        </div>
      </details>
      <LogoutDialog open={confirmingLogout} onOpenChange={setConfirmingLogout} />
    </>
  );
}
