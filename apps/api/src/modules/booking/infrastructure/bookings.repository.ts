import { Inject, Injectable } from '@nestjs/common';
import { normalizeInstagramHandle, normalizePhone } from '@beauty-lv/shared-kernel';
import { and, asc, desc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import {
  bookingItems,
  bookings,
  type BookingItemRow,
  type BookingRow,
} from '../../../shared/database/schema/bookings';
import { bookingSlots } from '../../../shared/database/schema/booking-slots';
import { clients } from '../../../shared/database/schema/clients';
import { organizations } from '../../../shared/database/schema/organizations';
import { publishedSlots } from '../../../shared/database/schema/published-slots';
import type { ServiceRow } from '../../../shared/database/schema/services';

export class SlotUnavailableError extends Error {
  constructor(message = 'Окно уже занято') {
    super(message);
  }
}

/**
 * How long a visit blocks the calendar: the services back to back, plus one
 * cleanup buffer at the end.
 *
 * The buffers are not summed. `buffer_after_minutes` is preparation and
 * tidying after the work, and a client who books three services gets that
 * once at the end of the visit — not between a haircut and a beard trim.
 * `max` rather than "the last one" because a cart has no meaningful order:
 * the block is extended by the largest cleanup any selected service needs.
 * With a single service this is exactly the old `duration + buffer`.
 */
export function visitDurationMinutes(services: ServiceRow[]): number {
  const work = services.reduce((total, service) => total + service.durationMinutes, 0);
  const cleanup = services.reduce((max, service) => Math.max(max, service.bufferAfterMinutes), 0);
  return work + cleanup;
}

export interface CreateBookingInput {
  organizationId: string;
  organizationMemberId: string;
  /** Existing window, or `startsAt` to open one for this booking. */
  publishedSlotId?: string;
  startsAt?: Date;
  /** One or more; the visit lasts as long as all of them together. */
  services: ServiceRow[];
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

/**
 * What a guest may see about their own booking — and nothing else.
 *
 * Assembled by hand rather than by spreading the row: the booking carries the
 * master's private annotations and the guest's own contacts, and a projection
 * built by omission leaks the next field somebody adds. The visitor already
 * knows their name and time; they do not need it read back to them from the
 * server, so it is not sent.
 */
export interface PublicBookingView {
  status: BookingRow['status'];
  startsAt: string;
  /** Work time only. The master's cleanup buffer is her turnaround, not the client's. */
  durationMinutes: number;
  items: {
    name: string;
    durationMinutes: number;
    priceAmountMinorUnits: number;
    priceCurrency: string;
  }[];
}

@Injectable()
export class BookingsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Atomic: the conditional `UPDATE ... WHERE status = 'available'` is what
   * actually prevents two people booking the same window at once (see
   * ARCHITECTURE.md §6) — if it claims fewer windows than the visit needs,
   * someone else got there first and the whole transaction rolls back.
   *
   * A visit claims *every* window it runs through, not just the one it
   * starts at. Windows carry no duration, so a two-hour appointment used to
   * leave the windows underneath it on sale.
   */
  async createBooking(input: CreateBookingInput): Promise<BookingRow> {
    if (input.services.length === 0) {
      throw new SlotUnavailableError('Не выбрано ни одной услуги');
    }

    return this.db.transaction(async (tx) => {
      /*
       * A master booking by hand may name a time she never published. The
       * window is opened inside this transaction rather than beforehand: a
       * separate call would leave an orphan window on the public page every
       * time the booking that followed it failed.
       */
      let startSlot: { id: string; startsAt: Date; organizationMemberId: string } | undefined;

      if (input.publishedSlotId) {
        [startSlot] = await tx
          .select({
            id: publishedSlots.id,
            startsAt: publishedSlots.startsAt,
            organizationMemberId: publishedSlots.organizationMemberId,
          })
          .from(publishedSlots)
          .where(eq(publishedSlots.id, input.publishedSlotId));
      } else if (input.startsAt) {
        const [created] = await tx
          .insert(publishedSlots)
          .values({
            organizationMemberId: input.organizationMemberId,
            startsAt: input.startsAt,
            status: 'available',
          })
          // The master may already have that exact window open; reuse it
          // rather than colliding with the (member, starts_at) unique index.
          .onConflictDoNothing()
          .returning({
            id: publishedSlots.id,
            startsAt: publishedSlots.startsAt,
            organizationMemberId: publishedSlots.organizationMemberId,
          });
        startSlot =
          created ??
          (
            await tx
              .select({
                id: publishedSlots.id,
                startsAt: publishedSlots.startsAt,
                organizationMemberId: publishedSlots.organizationMemberId,
              })
              .from(publishedSlots)
              .where(
                and(
                  eq(publishedSlots.organizationMemberId, input.organizationMemberId),
                  eq(publishedSlots.startsAt, input.startsAt),
                ),
              )
          )[0];
      }

      if (!startSlot) {
        throw new SlotUnavailableError('Окно не найдено');
      }

      const endsAt = new Date(
        startSlot.startsAt.getTime() + visitDurationMinutes(input.services) * 60_000,
      );

      // Every window of this master from the start (inclusive) to the end
      // (exclusive). A window exactly at `endsAt` belongs to the next visit.
      const covered = await tx
        .select({ id: publishedSlots.id })
        .from(publishedSlots)
        .where(
          and(
            eq(publishedSlots.organizationMemberId, startSlot.organizationMemberId),
            gte(publishedSlots.startsAt, startSlot.startsAt),
            lt(publishedSlots.startsAt, endsAt),
          ),
        )
        .orderBy(asc(publishedSlots.startsAt));

      const coveredIds = covered.map((slot) => slot.id);

      const claimed = await tx
        .update(publishedSlots)
        .set({ status: 'booked', updatedAt: new Date() })
        .where(and(inArray(publishedSlots.id, coveredIds), eq(publishedSlots.status, 'available')))
        .returning({ id: publishedSlots.id });

      // All or nothing. A partial claim would mean the visit overlaps someone
      // else's appointment, which is precisely what this exists to prevent.
      if (claimed.length !== coveredIds.length) {
        throw new SlotUnavailableError(
          coveredIds.length === 1
            ? 'Окно уже занято'
            : 'Для выбранных услуг не хватает свободного времени подряд',
        );
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
          publishedSlotId: startSlot.id,
          guestName: input.guestName,
          guestPhone: input.guestPhone,
          guestEmail: input.guestEmail,
          guestInstagram: input.guestInstagram,
          notes: input.notes,
          status: org?.autoConfirmBookings ? 'confirmed' : 'pending',
          source: input.source,
        })
        .returning();

      await tx.insert(bookingItems).values(
        input.services.map((service) => ({
          bookingId: booking!.id,
          serviceId: service.id,
          serviceNameSnapshot: service.name,
          durationMinutesSnapshot: service.durationMinutes,
          priceAmountSnapshot: service.priceAmount,
          priceCurrencySnapshot: service.priceCurrency,
        })),
      );

      await tx
        .insert(bookingSlots)
        .values(claimed.map((slot) => ({ bookingId: booking!.id, publishedSlotId: slot.id })));

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

  /**
   * The guest's own booking, addressed by the token they were given.
   *
   * Scoped by organisation as well as by token: the token alone would be
   * enough, but a booking read through the wrong master's page is a bug worth
   * failing on rather than answering.
   */
  async findPublicByToken(
    organizationId: string,
    publicToken: string,
  ): Promise<PublicBookingView | null> {
    const [row] = await this.db
      .select({ id: bookings.id, status: bookings.status, startsAt: publishedSlots.startsAt })
      .from(bookings)
      .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
      .where(
        and(
          eq(bookings.organizationId, organizationId),
          eq(bookings.publicToken, publicToken),
          isNull(bookings.deletedAt),
        ),
      )
      .limit(1);

    if (!row) return null;

    const items = await this.db
      .select()
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, row.id));

    return {
      status: row.status,
      startsAt: row.startsAt.toISOString(),
      durationMinutes: items.reduce((total, item) => total + item.durationMinutesSnapshot, 0),
      items: items.map((item) => ({
        name: item.serviceNameSnapshot,
        durationMinutes: item.durationMinutesSnapshot,
        priceAmountMinorUnits: item.priceAmountSnapshot,
        priceCurrency: item.priceCurrencySnapshot,
      })),
    };
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

  /**
   * Puts every window the booking held back on sale. Cancelling used to free
   * only the starting window, which would now strand the rest of a long
   * visit as permanently `booked`.
   *
   * The occupancy rows are stamped rather than deleted, so what a cancelled
   * visit held stays on record — and stamping is also what lets the partial
   * unique index accept a new booking for the same window.
   */
  async releaseSlotsForBooking(bookingId: string): Promise<number> {
    return this.db.transaction(async (tx) => {
      const released = await tx
        .update(bookingSlots)
        .set({ releasedAt: new Date() })
        .where(and(eq(bookingSlots.bookingId, bookingId), isNull(bookingSlots.releasedAt)))
        .returning({ publishedSlotId: bookingSlots.publishedSlotId });

      if (released.length === 0) return 0;

      await tx
        .update(publishedSlots)
        .set({ status: 'available', updatedAt: new Date() })
        .where(
          inArray(
            publishedSlots.id,
            released.map((row) => row.publishedSlotId),
          ),
        );

      return released.length;
    });
  }
}
