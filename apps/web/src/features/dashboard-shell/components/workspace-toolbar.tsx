'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';

import type { WorkspaceCapabilities } from '../capabilities';
import { WORKSPACE_ACTION, type WorkspaceAction } from '../workspace-actions';
import { createCommands, runCommand, type WorkspaceCommand } from '../workspace-commands';
import { AccountMenu } from './account-menu';
import { ActivityBell } from './activity-bell';
import { Icon } from './icon';
import { QuickSearch } from './quick-search';
import { ThemeToggle } from './theme-toggle';
import { WorkspaceClock } from './workspace-clock';
import { WorkspaceCreateSheet } from './workspace-create-sheet';
import { WorkspaceFab } from './workspace-fab';

/**
 * Шапка кабинета — прототип «Кабинет 2026», блок `.topbar`.
 *
 * Слева широкая строка поиска с ⌘K, справа часы заведения, колокольчик,
 * переключатель темы и белая «Создать». Это своя строка над экраном, а не
 * довесок к заголовку: шапка принадлежит кабинету и одинакова везде, а
 * заголовок принадлежит экрану и у каждого свой.
 *
 * На телефоне её место занимает `MobileTop`, и здесь она не рисуется вовсе.
 *
 * Поведение не меняется: ⌘K, событие `WORKSPACE_ACTION`, лист создания и
 * палитра поиска живут здесь же, потому что живут на каждом экране.
 */
export function WorkspaceToolbar({
  slug,
  capabilities,
  accountName,
  roleLabel,
}: {
  slug: string;
  capabilities: WorkspaceCapabilities;
  /** Имя для портрета в строке экрана на телефоне. */
  accountName: string;
  /** Роль под именем в раскрытом меню портрета. */
  roleLabel: string;
}) {
  const t = useT();
  const router = useRouter();
  const [action, setAction] = useState<WorkspaceAction | null>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  /* Один набор на меню, кнопку на телефоне и палитру ⌘K. */
  const commands = useMemo(() => createCommands(slug, t, capabilities), [slug, t, capabilities]);

  useEffect(() => {
    const receive = (event: Event) => {
      const next = (event as CustomEvent<WorkspaceAction>).detail;
      if (next.kind === 'booking' && !capabilities.canManageBookings) return;
      if (next.kind === 'client' && !capabilities.canManageClients) return;
      if (next.kind === 'block' && !capabilities.canManageCalendar) return;
      setAction(next);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector('summary')?.focus();
      }
      if (!(event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey))) return;
      if (document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      setAction({ kind: 'search' });
    };
    const outside = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    window.addEventListener(WORKSPACE_ACTION, receive);
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener(WORKSPACE_ACTION, receive);
      document.removeEventListener('keydown', key);
      document.removeEventListener('pointerdown', outside);
    };
  }, [capabilities]);

  /* Переход — ссылкой: её можно открыть в новой вкладке. Действие — кнопкой.
     Значок перед подписью — как в меню `.menu` прототипа. */
  const menuItem = (command: WorkspaceCommand) =>
    command.target.kind === 'href' ? (
      <Link key={command.id} href={command.target.href} className="menu-item">
        <Icon name={command.icon} className="ico-18" />
        <span>{command.label}</span>
      </Link>
    ) : (
      <button
        key={command.id}
        type="button"
        className="menu-item"
        onClick={() => runCommand(command, router)}
      >
        <Icon name={command.icon} className="ico-18" />
        <span>{command.label}</span>
      </button>
    );

  return (
    <>
      <div className="workspace-toolbar">
        <Button
          variant="raised"
          size="sm"
          className="workspace-search"
          aria-label={t.home.searchPlaceholder}
          onClick={() => setAction({ kind: 'search' })}
        >
          <Icon name="search" className="ico-18" />
          <span className="workspace-search__label">{t.home.searchPlaceholder}</span>
          <span className="kbd">⌘K</span>
        </Button>
        <span className="workspace-toolbar__spacer" />
        <WorkspaceClock />
        {capabilities.canManageBookings ? <ActivityBell slug={slug} /> : null}
        <ThemeToggle />
        {/* Портрет — только на телефоне: боковой панели с карточкой аккаунта
            там нет, и войти в тему, настройки и выход больше неоткуда. */}
        <div className="workspace-account">
          <AccountMenu accountName={accountName} panelLabel={roleLabel} />
        </div>
        {commands.length ? (
          <details className="row-menu workspace-create" ref={menu}>
            {/* Вторичная, а не розовая: розовым на экране залито одно
                действие, и оно принадлежит экрану, а не шапке. */}
            <Button asChild variant="secondary" className="workspace-create__button">
              <summary>
                <Icon name="plus" className="ico-18" />
                {t.workspace.create}
              </summary>
            </Button>
            <div
              className="popover-surface row-menu__list"
              onClick={() => {
                if (menu.current) menu.current.open = false;
              }}
            >
              {commands.map(menuItem)}
            </div>
          </details>
        ) : null}
      </div>
      <WorkspaceFab commands={commands} />
      <QuickSearch
        slug={slug}
        open={action?.kind === 'search'}
        onOpenChange={(open) => !open && setAction(null)}
      />
      {action && action.kind !== 'search' ? (
        <WorkspaceCreateSheet slug={slug} action={action} onClose={() => setAction(null)} />
      ) : null}
    </>
  );
}
