/**
 * Single source of truth for both role dimensions in the product (see
 * ARCHITECTURE.md and the dashboard-architecture plan):
 *
 * - `SystemRole` — platform-level identity (who you are on AMOLIE).
 * - `OrgRole` — your role *within one organization* (what you can do there).
 *
 * A new role is always: add to the array below, add one line to the
 * matching permission map. No guard, controller, or component changes.
 * DB schema files import these same arrays for their `pgEnum(...)`, so the
 * database and the app can never drift apart on valid role values.
 */

export const SYSTEM_ROLES = ['client', 'master', 'platform_admin'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const ORG_ROLES = ['owner', 'admin', 'master'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export type Permission =
  | 'org:calendar:manage'
  | 'org:bookings:manage'
  | 'org:services:manage'
  | 'org:clients:manage'
  | 'org:clients:export'
  | 'org:profile-page:manage'
  | 'org:finance:read'
  | 'org:finance:manage'
  | 'org:team:manage'
  | 'org:schedule:manage-others'
  | 'org:settings:manage'
  | 'admin:masters:manage'
  | 'admin:users:manage'
  | 'admin:registrations:manage'
  | 'admin:subscriptions:manage'
  | 'admin:logs:read'
  | 'admin:platform-settings:manage';

/**
 * Над чьими строками действует разрешение (SALON.md §3.1).
 *
 * Словарь разрешений не удваивается на `…:own` / `…:all`: «можно ли действие»
 * и «над чьими строками» — разные вопросы, и сведение их в одну строку
 * удваивало бы словарь при каждой новой роли. Охрана по-прежнему отвечает
 * только на первый; область спрашивает прикладной слой и передаёт репозиторию.
 */
export type PermissionScope = 'own' | 'organization';

const ORG_OWNER_PERMISSIONS: Permission[] = [
  'org:calendar:manage',
  'org:bookings:manage',
  'org:services:manage',
  'org:clients:manage',
  'org:clients:export',
  'org:profile-page:manage',
  'org:finance:read',
  'org:finance:manage',
  'org:team:manage',
  'org:schedule:manage-others',
  'org:settings:manage',
];

export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  client: [],
  // A master's org-scoped access comes entirely from ORG_ROLE_PERMISSIONS
  // (below) via their organization_members row, not from this table.
  master: [],
  platform_admin: [
    'admin:masters:manage',
    'admin:users:manage',
    'admin:registrations:manage',
    'admin:subscriptions:manage',
    'admin:logs:read',
    'admin:platform-settings:manage',
  ],
};

/**
 * Карта ролей организации — SALON.md §3.3.
 *
 * `admin` — администратор салона: делает всё, кроме настроек организации и
 * денег на выплату. `master` — наёмный мастер: ведёт свой день и общую
 * адресную книгу, но не команду, не прайс и не страницу салона.
 *
 * Клиенты — единственная строка, где у мастера область всей организации, и это
 * прямое продуктовое решение (SALON.md §5): книга у салона одна, человек
 * приходит в салон, а не к строке в чужом списке.
 */
export const ORG_ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: ORG_OWNER_PERMISSIONS,
  admin: [
    'org:calendar:manage',
    'org:bookings:manage',
    'org:services:manage',
    'org:clients:manage',
    'org:clients:export',
    'org:profile-page:manage',
    'org:finance:read',
    'org:team:manage',
    'org:schedule:manage-others',
  ],
  master: ['org:calendar:manage', 'org:bookings:manage', 'org:clients:manage', 'org:finance:read'],
};

/**
 * Область разрешения у роли — «своё» или «всей организации» (SALON.md §3.3).
 *
 * Наёмный мастер ведёт свой день: её календарь, её записи и её заработок.
 * Владелица и администратор видят организацию целиком. Клиенты — исключение,
 * названное в §3.3: книга общая у всех трёх ролей.
 *
 * Разрешения, у которых области нет вовсе (управление командой, прайс,
 * страница, настройки, выплаты), сюда не попадают: они либо есть у роли, либо
 * их нет, и спрашивать «над чьими строками» бессмысленно. Для них ответ —
 * `organization`: раз право выдано, оно действует на всю организацию.
 */
export function resolveScope(orgRole: OrgRole, permission: Permission): PermissionScope {
  if (orgRole !== 'master') return 'organization';

  switch (permission) {
    case 'org:calendar:manage':
    case 'org:bookings:manage':
    case 'org:finance:read':
      return 'own';
    default:
      return 'organization';
  }
}

/**
 * Composes both role dimensions into the effective permission set for one
 * request. `orgRole` is `null` when the request has no organization in
 * context (e.g. admin-panel routes) — platform-level permissions still
 * apply in that case.
 */
export function resolvePermissions(
  systemRole: SystemRole,
  orgRole: OrgRole | null,
): Set<Permission> {
  const permissions = new Set<Permission>(SYSTEM_ROLE_PERMISSIONS[systemRole]);
  if (orgRole) {
    for (const permission of ORG_ROLE_PERMISSIONS[orgRole]) {
      permissions.add(permission);
    }
  }
  return permissions;
}

export function hasPermission(
  systemRole: SystemRole,
  orgRole: OrgRole | null,
  permission: Permission,
): boolean {
  return resolvePermissions(systemRole, orgRole).has(permission);
}
