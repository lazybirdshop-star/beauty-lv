import { Inject, Injectable } from '@nestjs/common';
import type { OrgRole } from '@amolie/shared-kernel';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import {
  organizationInvites,
  type OrganizationInviteRow,
} from '../../../shared/database/schema/organization-invites';
import { organizations } from '../../../shared/database/schema/organizations';
import { users } from '../../../shared/database/schema/users';

export interface PendingInvite {
  id: string;
  email: string;
  role: OrgRole;
  displayName: string | null;
  expiresAt: Date;
  invitedBy: string;
  createdAt: Date;
}

@Injectable()
export class InvitesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Живые приглашения: не принятые, не отозванные и не протухшие. */
  async listPending(organizationId: string): Promise<PendingInvite[]> {
    const rows = await this.db
      .select({
        id: organizationInvites.id,
        email: organizationInvites.email,
        role: organizationInvites.role,
        displayName: organizationInvites.displayName,
        expiresAt: organizationInvites.expiresAt,
        createdAt: organizationInvites.createdAt,
        invitedBy: users.fullName,
      })
      .from(organizationInvites)
      .innerJoin(users, eq(organizationInvites.invitedByUserId, users.id))
      .where(
        and(
          eq(organizationInvites.organizationId, organizationId),
          isNull(organizationInvites.acceptedAt),
          isNull(organizationInvites.revokedAt),
          gt(organizationInvites.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(organizationInvites.createdAt));
    return rows;
  }

  async create(input: {
    organizationId: string;
    email: string;
    role: OrgRole;
    displayName: string | null;
    tokenHash: string;
    invitedByUserId: string;
    expiresAt: Date;
  }): Promise<OrganizationInviteRow> {
    const [row] = await this.db.insert(organizationInvites).values(input).returning();
    return row!;
  }

  /**
   * Отзыв — проставленная дата, а не удаление строки.
   *
   * Кто и когда позвал человека в салон, остаётся видимым, даже если позвали
   * ошибочно: в салоне это вопрос, который задают вслух.
   */
  async revoke(organizationId: string, inviteId: string): Promise<OrganizationInviteRow | null> {
    const [row] = await this.db
      .update(organizationInvites)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(organizationInvites.id, inviteId),
          eq(organizationInvites.organizationId, organizationId),
          isNull(organizationInvites.acceptedAt),
          isNull(organizationInvites.revokedAt),
        ),
      )
      .returning();
    return row ?? null;
  }

  /** Приглашение по хешу ссылки — вместе с тем, куда именно зовут. */
  async findLiveByHash(tokenHash: string) {
    const [row] = await this.db
      .select({
        invite: organizationInvites,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        organizationType: organizations.type,
      })
      .from(organizationInvites)
      .innerJoin(organizations, eq(organizationInvites.organizationId, organizations.id))
      .where(
        and(
          eq(organizationInvites.tokenHash, tokenHash),
          isNull(organizationInvites.acceptedAt),
          isNull(organizationInvites.revokedAt),
          gt(organizationInvites.expiresAt, new Date()),
          isNull(organizations.deletedAt),
        ),
      );
    return row ?? null;
  }

  /**
   * Гасит приглашение в одном запросе с условием «ещё не погашено».
   *
   * Возвращённый `null` означает, что кто-то успел раньше: два одновременных
   * перехода по одной ссылке иначе завели бы человека в салон дважды.
   */
  async consume(inviteId: string, memberId: string): Promise<OrganizationInviteRow | null> {
    const [row] = await this.db
      .update(organizationInvites)
      .set({ acceptedAt: new Date(), acceptedMemberId: memberId })
      .where(
        and(
          eq(organizationInvites.id, inviteId),
          isNull(organizationInvites.acceptedAt),
          isNull(organizationInvites.revokedAt),
        ),
      )
      .returning();
    return row ?? null;
  }
}
