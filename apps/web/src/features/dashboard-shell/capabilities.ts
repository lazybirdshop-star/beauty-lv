import {
  ORG_ROLE_PERMISSIONS,
  resolveScope,
  type OrgRole,
  type Permission,
} from '@amolie/shared-kernel';

/** Navigation reflects the same role map as the API. The API remains the authority. */
export function workspaceCapabilities(role: OrgRole | undefined) {
  const allowed = new Set<Permission>(role ? ORG_ROLE_PERMISSIONS[role] : []);
  return {
    canManageCalendar: allowed.has('org:calendar:manage'),
    canManageBookings: allowed.has('org:bookings:manage'),
    canManageClients: allowed.has('org:clients:manage'),
    canManageServices: allowed.has('org:services:manage'),
    canManagePage: allowed.has('org:profile-page:manage'),
    canManageWorkspace: allowed.has('org:settings:manage'),
    canManageTeam: allowed.has('org:team:manage'),
    canViewFinance:
      allowed.has('org:finance:read') &&
      Boolean(role && resolveScope(role, 'org:finance:read') === 'organization'),
  };
}
export type WorkspaceCapabilities = ReturnType<typeof workspaceCapabilities>;
