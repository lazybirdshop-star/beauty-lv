'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import type { WorkspaceCapabilities } from '../capabilities';
import { WORKSPACE_ACTION, type WorkspaceAction } from '../workspace-actions';
import { QuickSearch } from './quick-search';
import { WorkspaceCreateSheet } from './workspace-create-sheet';
import { Icon } from './icon';

export function WorkspaceToolbar({
  slug,
  capabilities,
}: {
  slug: string;
  capabilities: WorkspaceCapabilities;
}) {
  const t = useT();
  const [action, setAction] = useState<WorkspaceAction | null>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const receive = (event: Event) => {
      const next = (event as CustomEvent<WorkspaceAction>).detail;
      if (next.kind === 'booking' && !capabilities.canManageBookings) return;
      if (next.kind === 'client' && !capabilities.canManageClients) return;
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
            {capabilities.canManageBookings ? (
              <button type="button" onClick={() => setAction({ kind: 'booking' })}>
                {t.home.newBooking}
              </button>
            ) : null}
            {capabilities.canManageCalendar ? (
              <Link href={`/${slug}/dashboard/calendar?open=1`}>{t.workspace.openTime}</Link>
            ) : null}
            {capabilities.canManageClients ? (
              <button type="button" onClick={() => setAction({ kind: 'client' })}>
                {t.clients.add}
              </button>
            ) : null}
          </div>
        </details>
      </div>
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
