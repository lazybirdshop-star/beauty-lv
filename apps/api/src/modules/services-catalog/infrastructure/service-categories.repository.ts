import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import {
  serviceCategories,
  type NewServiceCategoryRow,
  type ServiceCategoryRow,
} from '../../../shared/database/schema/service-categories';
import { services } from '../../../shared/database/schema/services';

export type ServiceCategoryInput = Omit<
  NewServiceCategoryRow,
  'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

export interface ServiceCategoryWithCount extends ServiceCategoryRow {
  serviceCount: number;
}

@Injectable()
export class ServiceCategoriesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * The dashboard list carries the service count because that is what makes
   * "delete this category" a decision rather than a guess.
   */
  listForOrganization(organizationId: string): Promise<ServiceCategoryWithCount[]> {
    return this.db
      .select({
        id: serviceCategories.id,
        organizationId: serviceCategories.organizationId,
        name: serviceCategories.name,
        sortOrder: serviceCategories.sortOrder,
        isActive: serviceCategories.isActive,
        createdAt: serviceCategories.createdAt,
        updatedAt: serviceCategories.updatedAt,
        deletedAt: serviceCategories.deletedAt,
        serviceCount: sql<number>`count(${services.id})::int`,
      })
      .from(serviceCategories)
      .leftJoin(
        services,
        and(eq(services.categoryId, serviceCategories.id), isNull(services.deletedAt)),
      )
      .where(
        and(
          eq(serviceCategories.organizationId, organizationId),
          isNull(serviceCategories.deletedAt),
        ),
      )
      .groupBy(serviceCategories.id)
      .orderBy(asc(serviceCategories.sortOrder), asc(serviceCategories.createdAt));
  }

  /** Public page (API.md §6.2): visible categories only. */
  listActiveForOrganization(organizationId: string): Promise<ServiceCategoryRow[]> {
    return this.db
      .select()
      .from(serviceCategories)
      .where(
        and(
          eq(serviceCategories.organizationId, organizationId),
          eq(serviceCategories.isActive, true),
          isNull(serviceCategories.deletedAt),
        ),
      )
      .orderBy(asc(serviceCategories.sortOrder), asc(serviceCategories.createdAt));
  }

  /**
   * Tenancy check for `services.category_id`. The DTO can only prove the
   * value is a UUID; without this a master could attach her service to
   * another organisation's category — a cross-tenant reference that would
   * quietly break grouping and leak that the id exists.
   */
  async belongsToOrganization(organizationId: string, categoryId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: serviceCategories.id })
      .from(serviceCategories)
      .where(
        and(
          eq(serviceCategories.id, categoryId),
          eq(serviceCategories.organizationId, organizationId),
          isNull(serviceCategories.deletedAt),
        ),
      );
    return Boolean(row);
  }

  async create(
    organizationId: string,
    input: ServiceCategoryInput,
  ): Promise<ServiceCategoryWithCount> {
    // A new category goes to the end rather than fighting for position 0.
    const [{ next } = { next: 0 }] = await this.db
      .select({ next: sql<number>`coalesce(max(${serviceCategories.sortOrder}), -1) + 1` })
      .from(serviceCategories)
      .where(
        and(
          eq(serviceCategories.organizationId, organizationId),
          isNull(serviceCategories.deletedAt),
        ),
      );

    const [row] = await this.db
      .insert(serviceCategories)
      .values({ sortOrder: next, ...input, organizationId })
      .returning();
    return { ...row!, serviceCount: 0 };
  }

  async update(
    organizationId: string,
    categoryId: string,
    input: Partial<ServiceCategoryInput>,
  ): Promise<ServiceCategoryRow | null> {
    const [row] = await this.db
      .update(serviceCategories)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(
          eq(serviceCategories.id, categoryId),
          eq(serviceCategories.organizationId, organizationId),
          isNull(serviceCategories.deletedAt),
        ),
      )
      .returning();
    return row ?? null;
  }

  /**
   * Soft-deletes the category and detaches its services in one transaction.
   * The FK is `on delete set null`, but a soft delete never fires it — the
   * row is still there. Without the explicit detach the services would keep
   * pointing at an invisible category and vanish from every grouped view:
   * losing a grouping must never look like losing the work.
   */
  async softDelete(organizationId: string, categoryId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(serviceCategories)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(serviceCategories.id, categoryId),
            eq(serviceCategories.organizationId, organizationId),
            isNull(serviceCategories.deletedAt),
          ),
        )
        .returning({ id: serviceCategories.id });

      if (!row) return false;

      await tx
        .update(services)
        .set({ categoryId: null, updatedAt: new Date() })
        .where(
          and(eq(services.categoryId, categoryId), eq(services.organizationId, organizationId)),
        );

      return true;
    });
  }

  /** Reorder in one transaction: a half-applied order is worse than none. */
  async reorder(organizationId: string, orderedIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await Promise.all(
        orderedIds.map((id, index) =>
          tx
            .update(serviceCategories)
            .set({ sortOrder: index, updatedAt: new Date() })
            .where(
              and(
                eq(serviceCategories.id, id),
                eq(serviceCategories.organizationId, organizationId),
              ),
            ),
        ),
      );
    });
  }
}
