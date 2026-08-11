import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { users, type UserRow } from '../../../shared/database/schema/users';

export interface MembershipRow {
  organizationId: string;
  slug: string;
  name: string;
  role: string;
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async updateProfile(
    userId: string,
    input: Partial<
      Pick<
        UserRow,
        'fullName' | 'phone' | 'locale' | 'smsRemindersEnabled' | 'emailRemindersEnabled'
      >
    >,
  ): Promise<UserRow> {
    const [user] = await this.db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user!;
  }

  /**
   * Changing the password ends every session signed under the old one.
   *
   * The bump is part of the same statement, not a second call: a password
   * updated while the old tokens stayed valid is the exact state a
   * compromised account needs to be rescued from, and two statements can
   * leave it there if the second one fails. Incremented in SQL rather than
   * read-then-written for the same reason `bookings` claims slots that way.
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        passwordHash,
        tokenVersion: sql`${users.tokenVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async findMemberships(userId: string): Promise<MembershipRow[]> {
    return this.db
      .select({
        organizationId: organizations.id,
        slug: organizations.slug,
        name: organizations.name,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, userId));
  }
}
