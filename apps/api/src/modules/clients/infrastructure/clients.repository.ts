import { Inject, Injectable } from '@nestjs/common';
import { normalizeInstagramHandle, normalizePhone, phoneMatchKey } from '@amolie/shared-kernel';
import { and, asc, eq, isNull, or, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import {
  clients,
  type ClientRow,
  type NewClientRow,
} from '../../../shared/database/schema/clients';

export type ClientInput = Omit<
  NewClientRow,
  'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

function normalizeClientInput<T extends Partial<ClientInput>>(input: T): T {
  return {
    ...input,
    ...(input.phone ? { phone: normalizePhone(input.phone) } : {}),
    ...(input.instagramHandle
      ? { instagramHandle: normalizeInstagramHandle(input.instagramHandle) }
      : {}),
  };
}

@Injectable()
export class ClientsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  listForOrganization(organizationId: string): Promise<ClientRow[]> {
    return this.db
      .select()
      .from(clients)
      .where(and(eq(clients.organizationId, organizationId), isNull(clients.deletedAt)))
      .orderBy(asc(clients.fullName));
  }

  async create(organizationId: string, input: ClientInput): Promise<ClientRow> {
    const [row] = await this.db
      .insert(clients)
      .values({ ...normalizeClientInput(input), organizationId })
      .returning();
    return row!;
  }

  async update(
    organizationId: string,
    clientId: string,
    input: Partial<ClientInput>,
  ): Promise<ClientRow | null> {
    const [row] = await this.db
      .update(clients)
      .set({ ...normalizeClientInput(input), updatedAt: new Date() })
      .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
      .returning();
    return row ?? null;
  }

  async softDelete(organizationId: string, clientId: string): Promise<boolean> {
    const [row] = await this.db
      .update(clients)
      .set({ deletedAt: new Date() })
      .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
      .returning({ id: clients.id });
    return Boolean(row);
  }

  async setBlocked(
    organizationId: string,
    clientId: string,
    isBlocked: boolean,
  ): Promise<ClientRow | null> {
    const [row] = await this.db
      .update(clients)
      .set({ isBlocked, updatedAt: new Date() })
      .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
      .returning();
    return row ?? null;
  }

  /**
   * A blocked client shouldn't be able to route around the block by
   * booking under a phone she hasn't used before but the same Instagram
   * handle (or vice versa) — either identifier matching a blocked record
   * is enough to reject the booking.
   */
  /**
   * Is the person behind this contact blocked here?
   *
   * Matched on the tail of the number rather than on the stored string. An
   * equality check made the block a formatting puzzle: a client blocked as
   * `+37126123456` walked straight back in by typing `26123456`, or by
   * inserting a dash. The comparison strips both sides to digits in SQL and
   * compares the last `phoneMatchKey` returns — see the reasoning there.
   *
   * `right(...)` over an expression means this cannot use the index on
   * `phone`, which is acceptable: the scan is over one organization's own
   * blocked clients, a list of at most a handful of rows.
   */
  async findBlockedMatch(
    organizationId: string,
    phone: string,
    instagramHandle?: string,
  ): Promise<ClientRow | null> {
    const matchKey = phoneMatchKey(phone);
    const normalizedInstagram = instagramHandle
      ? normalizeInstagramHandle(instagramHandle)
      : undefined;

    /* Digits only, then the same tail length — the SQL mirror of
       phoneMatchKey. A number shorter than the key is compared whole, which
       is what `right()` on a short string already does. */
    const storedMatchKey = sql`right(regexp_replace(${clients.phone}, '\\D', '', 'g'), ${matchKey.length})`;
    const phoneMatches = matchKey.length > 0 ? sql`${storedMatchKey} = ${matchKey}` : sql`false`;

    const [row] = await this.db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.organizationId, organizationId),
          eq(clients.isBlocked, true),
          // Soft-deleted rows count too: removing someone from the address
          // book is not the same decision as letting them book again.
          normalizedInstagram
            ? or(phoneMatches, eq(clients.instagramHandle, normalizedInstagram))
            : phoneMatches,
        ),
      );
    return row ?? null;
  }
}
