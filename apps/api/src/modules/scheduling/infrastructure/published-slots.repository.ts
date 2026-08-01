import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import {
  publishedSlots,
  type PublishedSlotRow,
} from '../../../shared/database/schema/published-slots';

@Injectable()
export class PublishedSlotsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  listForMember(organizationMemberId: string): Promise<PublishedSlotRow[]> {
    return this.db
      .select()
      .from(publishedSlots)
      .where(eq(publishedSlots.organizationMemberId, organizationMemberId))
      .orderBy(asc(publishedSlots.startsAt));
  }

  /** Public availability (API.md §6.3): only `available` windows, across every member of the org. */
  async listAvailableForOrganization(organizationId: string): Promise<PublishedSlotRow[]> {
    const rows = await this.db
      .select({
        id: publishedSlots.id,
        organizationMemberId: publishedSlots.organizationMemberId,
        startsAt: publishedSlots.startsAt,
        status: publishedSlots.status,
        createdAt: publishedSlots.createdAt,
        updatedAt: publishedSlots.updatedAt,
      })
      .from(publishedSlots)
      .innerJoin(
        organizationMembers,
        eq(publishedSlots.organizationMemberId, organizationMembers.id),
      )
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(publishedSlots.status, 'available'),
        ),
      )
      .orderBy(asc(publishedSlots.startsAt));
    return rows;
  }

  /** Used by the public guest-booking flow to confirm the slot really belongs to this org before booking it. */
  async findByIdForOrganization(
    organizationId: string,
    slotId: string,
  ): Promise<PublishedSlotRow | null> {
    const [row] = await this.db
      .select({
        id: publishedSlots.id,
        organizationMemberId: publishedSlots.organizationMemberId,
        startsAt: publishedSlots.startsAt,
        status: publishedSlots.status,
        createdAt: publishedSlots.createdAt,
        updatedAt: publishedSlots.updatedAt,
      })
      .from(publishedSlots)
      .innerJoin(
        organizationMembers,
        eq(publishedSlots.organizationMemberId, organizationMembers.id),
      )
      .where(
        and(eq(publishedSlots.id, slotId), eq(organizationMembers.organizationId, organizationId)),
      );
    return row ?? null;
  }

  async publish(organizationMemberId: string, startsAt: Date): Promise<PublishedSlotRow> {
    const [row] = await this.db
      .insert(publishedSlots)
      .values({ organizationMemberId, startsAt, status: 'available' })
      .returning();
    return row!;
  }

  async findOwned(organizationMemberId: string, slotId: string): Promise<PublishedSlotRow | null> {
    const [row] = await this.db
      .select()
      .from(publishedSlots)
      .where(
        and(
          eq(publishedSlots.id, slotId),
          eq(publishedSlots.organizationMemberId, organizationMemberId),
        ),
      );
    return row ?? null;
  }

  /** Only ever deletes a still-`available` window the caller owns — never a booked one. */
  async removeAvailable(organizationMemberId: string, slotId: string): Promise<boolean> {
    const [row] = await this.db
      .delete(publishedSlots)
      .where(
        and(
          eq(publishedSlots.id, slotId),
          eq(publishedSlots.organizationMemberId, organizationMemberId),
          eq(publishedSlots.status, 'available'),
        ),
      )
      .returning({ id: publishedSlots.id });
    return Boolean(row);
  }
}
