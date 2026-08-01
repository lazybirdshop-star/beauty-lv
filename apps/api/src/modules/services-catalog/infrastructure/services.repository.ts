import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import {
  services,
  type NewServiceRow,
  type ServiceRow,
} from '../../../shared/database/schema/services';

export type ServiceInput = Omit<
  NewServiceRow,
  'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

@Injectable()
export class ServicesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  listForOrganization(organizationId: string): Promise<ServiceRow[]> {
    return this.db
      .select()
      .from(services)
      .where(and(eq(services.organizationId, organizationId), isNull(services.deletedAt)))
      .orderBy(asc(services.createdAt));
  }

  async findById(organizationId: string, serviceId: string): Promise<ServiceRow | null> {
    const [row] = await this.db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.organizationId, organizationId)));
    return row ?? null;
  }

  async create(organizationId: string, input: ServiceInput): Promise<ServiceRow> {
    const [row] = await this.db
      .insert(services)
      .values({ ...input, organizationId })
      .returning();
    return row!;
  }

  async update(
    organizationId: string,
    serviceId: string,
    input: Partial<ServiceInput>,
  ): Promise<ServiceRow | null> {
    const [row] = await this.db
      .update(services)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(services.id, serviceId), eq(services.organizationId, organizationId)))
      .returning();
    return row ?? null;
  }

  async softDelete(organizationId: string, serviceId: string): Promise<boolean> {
    const [row] = await this.db
      .update(services)
      .set({ deletedAt: new Date() })
      .where(and(eq(services.id, serviceId), eq(services.organizationId, organizationId)))
      .returning({ id: services.id });
    return Boolean(row);
  }
}
