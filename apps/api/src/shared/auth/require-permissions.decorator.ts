import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@amolie/shared-kernel';

export const PERMISSIONS_KEY = 'permissions';

/**
 * The one thing every protected controller expresses intent through — see
 * packages/shared-kernel/src/rbac.ts. Checked by `PermissionsGuard`, which
 * composes `request.user.role` (system-level) with `request.orgMembership`
 * (set by `OrgMembershipGuard`, when present).
 */
export const RequirePermissions = (...permissions: Permission[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(PERMISSIONS_KEY, permissions);
