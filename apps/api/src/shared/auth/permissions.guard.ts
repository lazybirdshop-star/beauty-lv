import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { resolvePermissions, type Permission, type SystemRole } from '@amolie/shared-kernel';

import type { AuthenticatedUser } from './current-user.decorator';
import { PERMISSIONS_KEY } from './require-permissions.decorator';
import type { OrgMembership } from './org-membership.guard';

interface RequestWithAuthContext {
  user?: AuthenticatedUser;
  orgMembership?: OrgMembership;
}

/**
 * The single place permissions are actually decided (see the RBAC design
 * in the dashboard-architecture plan). Must run after `JwtAuthGuard` and,
 * for org-scoped routes, after `OrgMembershipGuard`.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuthContext>();
    const systemRole = request.user?.role as SystemRole | undefined;

    if (!systemRole) {
      throw new ForbiddenException('PermissionsGuard used without JwtAuthGuard');
    }

    const granted = resolvePermissions(systemRole, request.orgMembership?.role ?? null);
    const allowed = required.every((permission) => granted.has(permission));

    if (!allowed) {
      throw new ForbiddenException('Недостаточно прав для этого действия');
    }
    return true;
  }
}
