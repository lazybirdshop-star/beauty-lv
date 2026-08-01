import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

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

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
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
