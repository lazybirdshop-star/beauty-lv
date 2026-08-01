import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { OrgRole } from '@beauty-lv/shared-kernel';
import { and, eq } from 'drizzle-orm';
import type { Request } from 'express';

import { DRIZZLE, type Database } from '../database/database.module';
import { organizationMembers } from '../database/schema/organization-members';
import { organizations } from '../database/schema/organizations';
import type { AuthenticatedUser } from './current-user.decorator';

export interface OrgMembership {
  organizationId: string;
  organizationMemberId: string;
  role: OrgRole;
}

interface RequestWithOrgContext extends Request {
  user?: AuthenticatedUser;
  orgMembership?: OrgMembership;
  params: { slug?: string };
}

/**
 * Resolves the caller's membership in the organization named by the
 * route's `:slug` param and attaches it as `request.orgMembership`. Must
 * run after `JwtAuthGuard`. Org role is always re-checked against the DB
 * on every request — never trusted from the JWT (the token carries no
 * org context on purpose, see shared-auth.module.ts).
 */
@Injectable()
export class OrgMembershipGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithOrgContext>();
    const slug = request.params.slug;

    if (!slug) {
      throw new BadRequestException('Route is missing an organization slug');
    }
    if (!request.user) {
      throw new ForbiddenException('OrgMembershipGuard used without JwtAuthGuard');
    }

    const [row] = await this.db
      .select({
        organizationId: organizations.id,
        organizationMemberId: organizationMembers.id,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(and(eq(organizations.slug, slug), eq(organizationMembers.userId, request.user.sub)));

    if (!row) {
      throw new ForbiddenException('Не состоите в этой организации');
    }

    request.orgMembership = {
      organizationId: row.organizationId,
      organizationMemberId: row.organizationMemberId,
      role: row.role,
    };
    return true;
  }
}
