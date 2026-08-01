import { Inject, Injectable } from '@nestjs/common';
import { normalizeInstagramHandle, normalizePhone } from '@beauty-lv/shared-kernel';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import {
  bookingItems,
  bookings,
  type BookingItemRow,
  type BookingRow,
} from '../../../shared/database/schema/bookings';
import { clients } from '../../../shared/database/schema/clients';
import { organizations } from '../../../shared/database/schema/organizations';
import { publishedSlots } from '../../../shared/database/schema/published-slots';
import type { ServiceRow } from '../../../shared/database/schema/services';

export class SlotUnavailableError extends Error {
  constructor() {
    super('Окно уже занято');
  }
}

export interface CreateBookingInput {
  organizationId: string;
  organizationMemberId: string;
  publishedSlotId: string;
  service: ServiceRow;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestInstagram?: string;
  notes?: string;
  source: BookingRow['source'];
}

export interface BookingWithDetails extends BookingRow {
  startsAt: Date;
  items: BookingItemRow[];
}

@Injectable()
export class BookingsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Atomic: the conditional `UPDATE ... WHERE status = 'available'` is what
   * actually prevents two people booking the same window at once (see
   * ARCHITECTURE.md §6) — if it affects zero rows, someone else already
   * took the slot and the whole transaction rolls back.
   */
  async createBooking(input: CreateBookingInput): Promise<BookingRow> {
    return this.db.transaction(async (tx) => {
      const [claimedSlot] = await tx
        .update(publishedSlots)
        .set({ status: 'booked', updatedAt: new Date() })
        .where(
          and(eq(publishedSlots.id, input.publishedSlotId), eq(publishedSlots.status, 'available')),
        )
        .returning({ id: publishedSlots.id });

      if (!claimedSlot) {
        throw new SlotUnavailableError();
      }

      const [org] = await tx
        .select({ autoConfirmBookings: organizations.autoConfirmBookings })
        .from(organizations)
        .where(eq(organizations.id, input.organizationId));

      const [booking] = await tx
        .insert(bookings)
        .values({
          organizationId: input.organizationId,
          organizationMemberId: input.organizationMemberId,
          publishedSlotId: input.publishedSlotId,
          guestName: input.guestName,
          guestPhone: input.guestPhone,
          guestEmail: input.guestEmail,
          guestInstagram: input.guestInstagram,
          notes: input.notes,
          status: org?.autoConfirmBookings ? 'confirmed' : 'pending',
          source: input.source,
        })
        .returning();

      await tx.insert(bookingItems).values({
        bookingId: booking!.id,
        serviceId: input.service.id,
        serviceNameSnapshot: input.service.name,
        durationMinutesSnapshot: input.service.durationMinutes,
        priceAmountSnapshot: input.service.priceAmount,
        priceCurrencySnapshot: input.service.priceCurrency,
      });

      // Every booking (master-entered or guest) keeps the client address
      // book current — de-duplicated by phone (DATABASE-adjacent decision,
      // see clients.ts) so a guest typing their name differently next time
      // still resolves to the same client. Name is set only on first
      // insert — a later booking never overwrites how the master already
      // knows this person.
      await tx
        .insert(clients)
        .values({
          organizationId: input.organizationId,
          fullName: input.guestName,
          phone: normalizePhone(input.guestPhone),
          email: input.guestEmail,
          instagramHandle: input.guestInstagram
            ? normalizeInstagramHandle(input.guestInstagram)
            : undefined,
        })
        .onConflictDoUpdate({
          target: [clients.organizationId, clients.phone],
          set: {
            email: sql`coalesce(${clients.email}, excluded.email)`,
            instagramHandle: sql`coalesce(${clients.instagramHandle}, excluded.instagram_handle)`,
            // A previously soft-deleted client re-books under the same
            // phone — she's active again, not still hidden from the list.
            deletedAt: null,
            updatedAt: new Date(),
          },
        });

      return booking!;
    });
  }

  async listForOrganization(organizationId: string): Promise<BookingWithDetails[]> {
    const rows = await this.db
      .select({ booking: bookings, startsAt: publishedSlots.startsAt })
      .from(bookings)
      .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
      .where(eq(bookings.organizationId, organizationId))
      .orderBy(desc(publishedSlots.startsAt));

    if (rows.length === 0) return [];

    const items = await this.db
      .select()
      .from(bookingItems)
      .where(
        inArray(
          bookingItems.bookingId,
          rows.map((row) => row.booking.id),
        ),
      );

    const itemsByBooking = new Map<string, BookingItemRow[]>();
    for (const item of items) {
      const forBooking = itemsByBooking.get(item.bookingId) ?? [];
      forBooking.push(item);
      itemsByBooking.set(item.bookingId, forBooking);
    }

    return rows.map((row) => ({
      ...row.booking,
      startsAt: row.startsAt,
      items: itemsByBooking.get(row.booking.id) ?? [],
    }));
  }

  async updateStatus(
    organizationId: string,
    bookingId: string,
    status: BookingRow['status'],
    cancellationReason?: string,
  ): Promise<BookingRow | null> {
    const [row] = await this.db
      .update(bookings)
      .set({ status, cancellationReason, updatedAt: new Date() })
      .where(and(eq(bookings.id, bookingId), eq(bookings.organizationId, organizationId)))
      .returning();
    return row ?? null;
  }

  /** Releases the slot back to `available` — used when a booking is cancelled. */
  async releaseSlot(publishedSlotId: string): Promise<void> {
    await this.db
      .update(publishedSlots)
      .set({ status: 'available', updatedAt: new Date() })
      .where(eq(publishedSlots.id, publishedSlotId));
  }
}
