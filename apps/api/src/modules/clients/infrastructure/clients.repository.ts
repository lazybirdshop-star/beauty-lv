import { Inject, Injectable } from '@nestjs/common';
import { normalizeInstagramHandle, normalizePhone } from '@amolie/shared-kernel';
import { and, asc, eq, isNull, or } from 'drizzle-orm';

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
  async findBlockedMatch(
    organizationId: string,
    phone: string,
    instagramHandle?: string,
  ): Promise<ClientRow | null> {
    const normalizedPhone = normalizePhone(phone);
    const normalizedInstagram = instagramHandle
      ? normalizeInstagramHandle(instagramHandle)
      : undefined;

    const [row] = await this.db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.organizationId, organizationId),
          eq(clients.isBlocked, true),
          normalizedInstagram
            ? or(
                eq(clients.phone, normalizedPhone),
                eq(clients.instagramHandle, normalizedInstagram),
              )
            : eq(clients.phone, normalizedPhone),
        ),
      );
    return row ?? null;
  }
}
