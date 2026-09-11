'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import type { WorkspaceCapabilities } from '../capabilities';
import { WORKSPACE_ACTION, type WorkspaceAction } from '../workspace-actions';
import { createCommands, runCommand, type WorkspaceCommand } from '../workspace-commands';
import { ActivityBell } from './activity-bell';
import { QuickSearch } from './quick-search';
import { WorkspaceCreateSheet } from './workspace-create-sheet';
import { WorkspaceFab } from './workspace-fab';
import { Icon } from './icon';

export function WorkspaceToolbar({
  slug,
  capabilities,
}: {
  slug: string;
  capabilities: WorkspaceCapabilities;
}) {
  const t = useT();
  const router = useRouter();
  const [action, setAction] = useState<WorkspaceAction | null>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  /* Один набор на меню, кнопку на телефоне и палитру ⌘K. */
  const commands = useMemo(() => createCommands(slug, t, capabilities), [slug, t, capabilities]);
  const frequent = commands.filter((command) => !command.rare);
  const rare = commands.filter((command) => command.rare);

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

  /* Переход — ссылкой: её можно открыть в новой вкладке. Действие — кнопкой. */
  const menuItem = (command: WorkspaceCommand) =>
    command.target.kind === 'href' ? (
      <Link key={command.id} href={command.target.href}>
        {command.label}
      </Link>
    ) : (
      <button key={command.id} type="button" onClick={() => runCommand(command, router)}>
        {command.label}
      </button>
    );

  return (
    <>
      <div className="workspace-toolbar">
        <button
          className="search workspace-search"
          type="button"
          onClick={() => setAction({ kind: 'search' })}
        >
          <Icon name="search" className="ico-18" />
          <span>{t.home.searchPlaceholder}</span>
          <span className="kbd">⌘K</span>
        </button>
        {capabilities.canManageBookings ? <ActivityBell slug={slug} /> : null}
        {commands.length ? (
          <details className="row-menu workspace-create" ref={menu}>
            <summary className="btn btn-primary">
              <Icon name="plus" className="ico-18" />
              {t.workspace.create}
            </summary>
            <div
              className="row-menu__list"
              onClick={() => {
                if (menu.current) menu.current.open = false;
              }}
            >
              {frequent.map(menuItem)}
              {/* Ниже черты — то, что делают не каждый день: частое сверху, и
                  список не превращается в пятнадцать пунктов (спецификация §7). */}
              {frequent.length && rare.length ? (
                <div className="row-menu__sep" role="separator" />
              ) : null}
              {rare.map(menuItem)}
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
