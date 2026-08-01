import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';

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
      .values({ ...input, organizationId })
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
      .set({ ...input, updatedAt: new Date() })
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
}
