import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { serviceAddons } from '../../../shared/database/schema/service-addons';
import { services } from '../../../shared/database/schema/services';

export interface ServiceAddonPair {
  serviceId: string;
  addonServiceId: string;
}

@Injectable()
export class ServiceAddonsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Every suggestion in the organisation, as flat pairs.
   *
   * Flat rather than nested per service because the booking page needs the
   * whole map at once — the cart re-computes what to offer after every tap,
   * and a request per selected service would be a waterfall for no gain.
   *
   * Joined against `services` so pairs pointing at a soft-deleted or hidden
   * service never leave the server: rows survive a soft delete, and a
   * suggestion the client cannot book is worse than no suggestion.
   */
  async listPairs(organizationId: string, activeOnly: boolean): Promise<ServiceAddonPair[]> {
    const addonService = services;
    const rows = await this.db
      .select({
        serviceId: serviceAddons.serviceId,
        addonServiceId: serviceAddons.addonServiceId,
        sortOrder: serviceAddons.sortOrder,
      })
      .from(serviceAddons)
      .innerJoin(
        addonService,
        and(
          eq(addonService.id, serviceAddons.addonServiceId),
          eq(addonService.organizationId, organizationId),
          isNull(addonService.deletedAt),
          ...(activeOnly ? [eq(addonService.isActive, true)] : []),
        ),
      )
      .orderBy(asc(serviceAddons.sortOrder));

    return rows.map(({ serviceId, addonServiceId }) => ({ serviceId, addonServiceId }));
  }

  /** Suggestions attached to one service, in the master's order. */
  async listForService(serviceId: string): Promise<string[]> {
    const rows = await this.db
      .select({ addonServiceId: serviceAddons.addonServiceId })
      .from(serviceAddons)
      .where(eq(serviceAddons.serviceId, serviceId))
      .orderBy(asc(serviceAddons.sortOrder));
    return rows.map((row) => row.addonServiceId);
  }

  /**
   * Replaces the whole chain for a service in one transaction — the editor
   * sends the full list, so a diff would only add ways for the stored set to
   * drift from what the master sees.
   */
  async replaceForService(serviceId: string, addonServiceIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(serviceAddons).where(eq(serviceAddons.serviceId, serviceId));
      if (addonServiceIds.length === 0) return;
      await tx.insert(serviceAddons).values(
        addonServiceIds.map((addonServiceId, index) => ({
          serviceId,
          addonServiceId,
          sortOrder: index,
        })),
      );
    });
  }

  /** Confirms every id is a live service of this organisation before it is stored. */
  async allBelongToOrganization(organizationId: string, serviceIds: string[]): Promise<boolean> {
    if (serviceIds.length === 0) return true;
    const rows = await this.db
      .select({ id: services.id })
      .from(services)
      .where(
        and(
          eq(services.organizationId, organizationId),
          inArray(services.id, serviceIds),
          isNull(services.deletedAt),
        ),
      );
    return rows.length === serviceIds.length;
  }
}
