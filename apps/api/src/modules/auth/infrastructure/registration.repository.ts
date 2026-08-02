import { Inject, Injectable } from '@nestjs/common';
import { toOrganizationSlug } from '@beauty-lv/shared-kernel';
import { and, eq, gt, isNull, or } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { inviteCodes } from '../../../shared/database/schema/invite-codes';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { users, type UserRow } from '../../../shared/database/schema/users';

/** The code does not exist, was already redeemed, was revoked, or has expired. */
export class InviteCodeInvalidError extends Error {
  constructor() {
    super('Код приглашения недействителен');
  }
}

export class EmailTakenError extends Error {
  constructor() {
    super('Этот email уже зарегистрирован');
  }
}

export interface RegisterInput {
  code: string;
  fullName: string;
  email: string;
  passwordHash: string;
}

export interface RegisterResult {
  user: UserRow;
  organizationSlug: string;
}

@Injectable()
export class RegistrationRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Everything or nothing: an invite code must not be burned unless the
   * account and organization behind it actually came into existence, and a
   * half-created master (user without organization) would land in a
   * dashboard that redirects nowhere.
   *
   * The code is claimed with a conditional UPDATE rather than a read-then-write
   * — two people redeeming the same code simultaneously would both pass a
   * `SELECT` check. Zero rows updated means someone else got there first and
   * the whole transaction rolls back (same technique as slot claiming in
   * `bookings.repository.ts`).
   */
  async register(input: RegisterInput): Promise<RegisterResult> {
    const email = input.email.trim().toLowerCase();

    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    if (existing.length > 0) {
      throw new EmailTakenError();
    }

    return this.db.transaction(async (tx) => {
      const now = new Date();

      const [claimed] = await tx
        .update(inviteCodes)
        .set({ status: 'used', usedAt: now, updatedAt: now })
        .where(
          and(
            eq(inviteCodes.code, input.code),
            eq(inviteCodes.status, 'active'),
            or(isNull(inviteCodes.expiresAt), gt(inviteCodes.expiresAt, now)),
          ),
        )
        .returning({ id: inviteCodes.id });

      if (!claimed) {
        throw new InviteCodeInvalidError();
      }

      const [user] = await tx
        .insert(users)
        .values({
          email,
          fullName: input.fullName.trim(),
          passwordHash: input.passwordHash,
          systemRole: 'master',
          // Registering is the consent moment (TASKS.md A-8) — recorded here
          // rather than left null and backfilled later.
          gdprConsentAt: now,
        })
        .returning();

      const slug = await this.reserveSlug(tx, toOrganizationSlug(input.fullName));

      const [organization] = await tx
        .insert(organizations)
        .values({
          ownerUserId: user!.id,
          name: input.fullName.trim(),
          slug,
          type: 'solo',
          contactEmail: email,
        })
        .returning({ id: organizations.id, slug: organizations.slug });

      await tx.insert(organizationMembers).values({
        organizationId: organization!.id,
        userId: user!.id,
        role: 'owner',
      });

      await tx
        .update(inviteCodes)
        .set({ usedByUserId: user!.id, createdOrganizationId: organization!.id })
        .where(eq(inviteCodes.id, claimed.id));

      return { user: user!, organizationSlug: organization!.slug };
    });
  }

  /** `alisa-ozola`, then `alisa-ozola-2`, `-3`… — the slug is a public address, so collisions must resolve, not fail. */
  private async reserveSlug(tx: Database, base: string): Promise<string> {
    for (let attempt = 1; attempt <= 50; attempt += 1) {
      const candidate = attempt === 1 ? base : `${base}-${attempt}`;
      const [taken] = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, candidate));
      if (!taken) return candidate;
    }
    // 50 masters sharing one name is not a case worth silently degrading.
    throw new Error(`Не удалось подобрать свободный адрес страницы для «${base}»`);
  }
}
