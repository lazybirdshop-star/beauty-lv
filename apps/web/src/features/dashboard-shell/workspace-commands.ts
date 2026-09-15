import type { Messages } from '@/lib/i18n/messages';
import { foldForSearch } from '@/lib/list-search';

import type { WorkspaceCapabilities } from './capabilities';
import type { IconName } from './components/icon';
import { getMasterNavItems } from './nav-config';
import { openWorkspaceAction, type WorkspaceAction } from './workspace-actions';

/**
 * Что можно сделать и куда перейти — одним списком на три места.
 *
 * Меню «Создать» на большом экране, шторка «Создать» на телефоне и палитра ⌘K
 * (спецификация §6, §84) показывают одно и то же. Три своих списка разошлись
 * бы при первом новом действии: «Заблокировать время» появилось бы в меню и
 * забылось в палитре. Права — из той же карты ролей, что у API.
 */
export interface WorkspaceCommand {
  id: string;
  group: 'create' | 'go';
  label: string;
  /** Что действие заводит — строкой под названием в шторке и палитре. */
  hint?: string;
  icon: IconName;
  target:
    | { kind: 'action'; action: Exclude<WorkspaceAction, { kind: 'search' }> }
    | { kind: 'href'; href: string };
}

/** Порядок — прототипа «Кабинет 2026»: от ежедневного к редкому, без черты. */
export function createCommands(
  slug: string,
  t: Messages,
  can: WorkspaceCapabilities,
): WorkspaceCommand[] {
  const base = `/${slug}/dashboard`;
  const w = t.workspace;
  const candidates: [boolean, WorkspaceCommand][] = [
    [
      can.canManageBookings,
      {
        id: 'new-booking',
        group: 'create',
        label: t.home.newBooking,
        hint: w.createBookingHint,
        icon: 'plus',
        target: { kind: 'action', action: { kind: 'booking' } },
      },
    ],
    [
      can.canManageCalendar,
      {
        id: 'open-time',
        group: 'create',
        label: w.openTime,
        hint: w.createOpenTimeHint,
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
        hint: w.createBlockHint,
        icon: 'block',
        target: { kind: 'action', action: { kind: 'block' } },
      },
    ],
    [
      can.canManageClients,
      {
        id: 'new-client',
        group: 'create',
        label: w.createClient,
        hint: w.createClientHint,
        icon: 'user',
        target: { kind: 'action', action: { kind: 'client' } },
      },
    ],
    [
      can.canManageServices,
      {
        id: 'add-service',
        group: 'create',
        label: w.createService,
        hint: w.createServiceHint,
        icon: 'services',
        target: { kind: 'href', href: `${base}/services?new=1` },
      },
    ],
    [
      can.canManageTeam,
      {
        id: 'add-member',
        group: 'create',
        label: w.createInvite,
        hint: w.createInviteHint,
        icon: 'team',
        target: { kind: 'href', href: `${base}/team?invite=1` },
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

/**
 * `needle` — уже свёрнутый `foldForSearch`: «bloķēt» находится и по «blok».
 * Ищет и по пояснению: «обед» находит «Заблокировать время».
 */
export function matchCommands(commands: WorkspaceCommand[], needle: string): WorkspaceCommand[] {
  return commands.filter(
    (command) =>
      foldForSearch(command.label).includes(needle) ||
      foldForSearch(command.hint ?? '').includes(needle),
  );
}

export function runCommand(command: WorkspaceCommand, router: { push: (href: string) => void }) {
  if (command.target.kind === 'href') router.push(command.target.href);
  else openWorkspaceAction(command.target.action);
}
