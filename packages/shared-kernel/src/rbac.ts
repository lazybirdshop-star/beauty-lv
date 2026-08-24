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
  | 'org:profile-page:manage'
  | 'org:settings:manage'
  | 'admin:masters:manage'
  | 'admin:users:manage'
  | 'admin:registrations:manage'
  | 'admin:subscriptions:manage'
  | 'admin:logs:read'
  | 'admin:platform-settings:manage';

const ORG_OWNER_PERMISSIONS: Permission[] = [
  'org:calendar:manage',
  'org:bookings:manage',
  'org:services:manage',
  'org:clients:manage',
  'org:profile-page:manage',
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

export const ORG_ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: ORG_OWNER_PERMISSIONS,
  // Today "admin" (salon staff with elevated rights) gets the same access
  // as owner minus organization-wide settings. Tune independently once a
  // real salon multi-staff flow exists (TASKS.md O-5/O-6).
  admin: ORG_OWNER_PERMISSIONS.filter((permission) => permission !== 'org:settings:manage'),
  master: ['org:calendar:manage', 'org:bookings:manage', 'org:clients:manage'],
};

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
