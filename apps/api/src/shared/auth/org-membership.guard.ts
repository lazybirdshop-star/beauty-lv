import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { OrgRole } from '@amolie/shared-kernel';
import { and, eq, isNull } from 'drizzle-orm';
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
 *
 * Строка членства годится в пропуск, только если она живая: `status` даёт
 * `invited` (приглашение отправлено, но человек ещё не вошёл) и `disabled`
 * (сотрудница отстранена), а `deleted_at` — вышедших из салона. Раньше
 * условия по этим полям здесь не было, хотя остальной код их проверяет
 * везде (`impersonation.service.ts`, `account-deletion.repository.ts`,
 * `master-detail.repository.ts`, `admin.repository.ts`). Дыры это ещё не
 * давало — единственный поток создания членства заводит `owner`/`active`,
 * — но она открывалась бы первым же приглашением сотрудника: приглашённая
 * получала бы полный доступ к салону до того, как приглашение принято, а
 * отстранённая сохраняла бы его после отстранения.
 *
 * `organizations.status` здесь намеренно **не** проверяется. Приостановка
 * и архив закрывают витрину и новые записи, но не кабинет: назначенные
 * визиты мастер обязана довести, а разговор с площадкой ведут не отъёмом
 * доступа к собственным данным (см. `update-organization-status.dto.ts` —
 * «разница в намерении, а не в правах»). Удалённая организация — другое
 * дело, её нет.
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
      .where(
        and(
          eq(organizations.slug, slug),
          eq(organizationMembers.userId, request.user.sub),
          eq(organizationMembers.status, 'active'),
          isNull(organizationMembers.deletedAt),
          isNull(organizations.deletedAt),
        ),
      );

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
