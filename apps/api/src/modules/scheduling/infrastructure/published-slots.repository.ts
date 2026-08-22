import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gte } from 'drizzle-orm';

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
          /* Только будущее. Окно, которое мастер опубликовала и на которое
             никто не пришёл, остаётся `available` навсегда — так и задумано,
             это её календарь, — но клиенту оно предлагаться не может: до
             этой строки страница показывала «ближайшее свободное» на неделю
             назад, и запись на вчера доходила до сервера. */
          gte(publishedSlots.startsAt, new Date()),
        ),
      )
      .orderBy(asc(publishedSlots.startsAt));
    return rows;
  }

  /**
   * Available windows a visit of `durationMinutes` actually fits into.
   *
   * A window is only a starting point — it carries no length — so "does this
   * fit" means: is any window of the same master already `booked` between
   * this start and the end of the visit. Gaps in the published schedule do
   * not block anything; unpublished time is nobody else's appointment.
   *
   * That last sentence is a decision, and it has a known cost worth stating
   * plainly rather than rediscovering: not publishing a window is also the
   * only way a master can say "busy" (there are no working hours and no
   * blocks — PRD.md §7.4). So a master free at 10:00 for half an hour, with
   * 10:30 left unpublished because she is out, is still offered as the start
   * of a ninety-minute visit, and the booking will run over the time she
   * never opened. The client chooses the service, so she cannot prevent it by
   * choosing what to publish.
   *
   * Accepted knowingly: answering "does this fit" needs either a grid step or
   * a length on the window, and the product has neither. Both are real
   * options (organizations.slot_step_minutes, or an explicit end on the
   * window) and both are schema changes; until one is taken, this is the
   * behaviour, not an oversight. Whoever adds durations to windows should
   * come back here first.
   *
   * Filtered in memory rather than SQL on purpose. The set is one master's
   * published windows — hundreds at most — and the alternative is a
   * correlated self-join whose intent nobody would read at a glance.
   */
  async listAvailableFittingDuration(
    organizationId: string,
    durationMinutes: number,
  ): Promise<PublishedSlotRow[]> {
    const all = await this.db
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
      /* И здесь тоже только будущее: этот запрос отвечает на тот же вопрос
         клиента, просто с оглядкой на длительность услуги. */
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          gte(publishedSlots.startsAt, new Date()),
        ),
      )
      .orderBy(asc(publishedSlots.startsAt));

    const bookedByMember = new Map<string, number[]>();
    for (const slot of all) {
      if (slot.status !== 'booked') continue;
      const times = bookedByMember.get(slot.organizationMemberId) ?? [];
      times.push(slot.startsAt.getTime());
      bookedByMember.set(slot.organizationMemberId, times);
    }

    const span = durationMinutes * 60_000;
    return all.filter((slot) => {
      if (slot.status !== 'available') return false;
      const start = slot.startsAt.getTime();
      const end = start + span;
      const booked = bookedByMember.get(slot.organizationMemberId) ?? [];
      // Strictly after the start: the window itself is the one being claimed.
      return !booked.some((taken) => taken > start && taken < end);
    });
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

  /**
   * Bulk publish. `onConflictDoNothing` rather than a plain insert on
   * purpose: republishing a day that already has some windows is a normal
   * thing for a master to do, and it must not fail — it should just fill in
   * the gaps. The caller learns how many were skipped so the UI can say so
   * instead of silently claiming success for windows that already existed.
   */
  async publishMany(
    organizationMemberId: string,
    startsAtList: Date[],
  ): Promise<{ created: PublishedSlotRow[]; skipped: number }> {
    if (startsAtList.length === 0) return { created: [], skipped: 0 };

    const created = await this.db
      .insert(publishedSlots)
      .values(
        startsAtList.map((startsAt) => ({
          organizationMemberId,
          startsAt,
          status: 'available' as const,
        })),
      )
      .onConflictDoNothing()
      .returning();

    return { created, skipped: startsAtList.length - created.length };
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

  /**
   * Moves a window to another time. Restricted to `available` in the WHERE
   * clause, not just checked beforehand: a booking could land on the slot
   * between the check and the update, and silently moving a client's
   * appointment is the one outcome that must be impossible here.
   */
  async rescheduleAvailable(
    organizationMemberId: string,
    slotId: string,
    startsAt: Date,
  ): Promise<PublishedSlotRow | null> {
    const [row] = await this.db
      .update(publishedSlots)
      .set({ startsAt, updatedAt: new Date() })
      .where(
        and(
          eq(publishedSlots.id, slotId),
          eq(publishedSlots.organizationMemberId, organizationMemberId),
          eq(publishedSlots.status, 'available'),
        ),
      )
      .returning();
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
