import type { Messages } from '@/lib/i18n/messages';
import { foldForSearch } from '@/lib/list-search';

import type { WorkspaceCapabilities } from './capabilities';
import type { IconName } from './components/icon';
import { getMasterNavItems } from './nav-config';
import { openWorkspaceAction, type WorkspaceAction } from './workspace-actions';

/**
 * Что можно сделать и куда перейти — одним списком на три места.
 *
 * Меню «Создать» на большом экране, кнопка «+» на телефоне и палитра ⌘K
 * (спецификация §6, §84) показывают одно и то же. Три своих списка разошлись
 * бы при первом новом действии: «Заблокировать время» появилось бы в меню и
 * забылось в палитре. Права — из той же карты ролей, что у API.
 */
export interface WorkspaceCommand {
  id: string;
  group: 'create' | 'go';
  label: string;
  icon: IconName;
  /** Нечастое действие — в меню «Создать» под чертой. */
  rare?: boolean;
  target:
    | { kind: 'action'; action: Exclude<WorkspaceAction, { kind: 'search' }> }
    | { kind: 'href'; href: string };
}

export function createCommands(
  slug: string,
  t: Messages,
  can: WorkspaceCapabilities,
): WorkspaceCommand[] {
  const base = `/${slug}/dashboard`;
  const candidates: [boolean, WorkspaceCommand][] = [
    [
      can.canManageBookings,
      {
        id: 'new-booking',
        group: 'create',
        label: t.home.newBooking,
        icon: 'plus',
        target: { kind: 'action', action: { kind: 'booking' } },
      },
    ],
    [
      can.canManageCalendar,
      {
        id: 'open-time',
        group: 'create',
        label: t.workspace.openTime,
        icon: 'clock',
        target: { kind: 'href', href: `${base}/calendar?open=1` },
      },
    ],
    [
      can.canManageCalendar,
      {
        id: 'block-time',
        group: 'create',
        label: t.schedule.blockTime,
        icon: 'lock',
        target: { kind: 'action', action: { kind: 'block' } },
      },
    ],
    [
      can.canManageClients,
      {
        id: 'new-client',
        group: 'create',
        label: t.clients.add,
        icon: 'user',
        target: { kind: 'action', action: { kind: 'client' } },
      },
    ],
    [
      can.canManageTeam,
      {
        id: 'add-member',
        group: 'create',
        label: t.workspace.addMember,
        icon: 'clients',
        rare: true,
        target: { kind: 'href', href: `${base}/team?invite=1` },
      },
    ],
    [
      can.canManageServices,
      {
        id: 'add-service',
        group: 'create',
        label: t.services.addService,
        icon: 'services',
        rare: true,
        target: { kind: 'href', href: `${base}/services?new=1` },
      },
    ],
  ];
  return candidates.filter(([allowed]) => allowed).map(([, command]) => command);
}

/** Действия и разделы кабинета — всё, что палитра предлагает без поиска. */
export function workspaceCommands(
  slug: string,
  t: Messages,
  can: WorkspaceCapabilities,
): WorkspaceCommand[] {
  /* Внешние пункты (почта поддержки) — не переход внутри кабинета. */
  const go = getMasterNavItems(slug, t, can)
    .filter((item) => !item.external)
    .map((item): WorkspaceCommand => ({
      id: `go-${item.key}`,
      group: 'go',
      label: item.label,
      icon: item.icon,
      target: { kind: 'href', href: item.href },
    }));
  return [...createCommands(slug, t, can), ...go];
}

/** `needle` — уже свёрнутый `foldForSearch`: «bloķēt» находится и по «blok». */
export function matchCommands(commands: WorkspaceCommand[], needle: string): WorkspaceCommand[] {
  return commands.filter((command) => foldForSearch(command.label).includes(needle));
}

export function runCommand(command: WorkspaceCommand, router: { push: (href: string) => void }) {
  if (command.target.kind === 'href') router.push(command.target.href);
  else openWorkspaceAction(command.target.action);
}
