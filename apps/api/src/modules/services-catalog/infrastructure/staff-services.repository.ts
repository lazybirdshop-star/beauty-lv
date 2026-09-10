import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { services } from '../../../shared/database/schema/services';
import { staffServices } from '../../../shared/database/schema/staff-services';
import { users } from '../../../shared/database/schema/users';

/** Мастер и его условия по одной услуге. */
export interface ServicePerformer {
  organizationMemberId: string;
  name: string;
  avatarUrl: string | null;
  /** `null` — цена из прайса, а не «бесплатно». */
  priceOverrideAmount: number | null;
  durationOverrideMinutes: number | null;
}

/** Переопределения на пару (мастер, услуга) — то, что нужно расчёту визита. */
export interface StaffOverride {
  serviceId: string;
  priceOverrideAmount: number | null;
  durationOverrideMinutes: number | null;
}

export interface PerformerInput {
  organizationMemberId: string;
  priceOverrideAmount?: number | null;
  durationOverrideMinutes?: number | null;
}

@Injectable()
export class StaffServicesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Кто оказывает услугу — с именем, потому что список читает человек. */
  listPerformers(organizationId: string, serviceId: string): Promise<ServicePerformer[]> {
    return this.db
      .select({
        organizationMemberId: staffServices.organizationMemberId,
        name: sql<string>`coalesce(nullif(trim(${organizationMembers.displayName}), ''), ${users.fullName})`,
        avatarUrl: organizationMembers.avatarUrl,
        priceOverrideAmount: staffServices.priceOverrideAmount,
        durationOverrideMinutes: staffServices.durationOverrideMinutes,
      })
      .from(staffServices)
      .innerJoin(
        organizationMembers,
        eq(staffServices.organizationMemberId, organizationMembers.id),
      )
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(staffServices.serviceId, serviceId),
          eq(organizationMembers.organizationId, organizationId),
          isNull(organizationMembers.deletedAt),
        ),
      )
      .orderBy(organizationMembers.createdAt);
  }

  /**
   * Условия мастера по названным услугам.
   *
   * Возвращаются только существующие пары: отсутствие строки означает «этот
   * мастер услугу не оказывает», и подставлять за него прайс организации
   * нельзя — на этом и стоит проверка SL-8.
   */
  findOverrides(organizationMemberId: string, serviceIds: string[]): Promise<StaffOverride[]> {
    if (!serviceIds.length) return Promise.resolve([]);
    return this.db
      .select({
        serviceId: staffServices.serviceId,
        priceOverrideAmount: staffServices.priceOverrideAmount,
        durationOverrideMinutes: staffServices.durationOverrideMinutes,
      })
      .from(staffServices)
      .where(
        and(
          eq(staffServices.organizationMemberId, organizationMemberId),
          inArray(staffServices.serviceId, serviceIds),
        ),
      );
  }

  /**
   * Полная замена списка исполнителей услуги.
   *
   * Замена, а не «добавить/убрать по одному»: экран показывает набор
   * галочек целиком, и отправлять его частями значит рисковать тем, что
   * половина применилась. Одной транзакцией — по той же причине.
   *
   * Чужие участники отсеиваются здесь, а не выше: идентификаторы приходят с
   * формы, и единственная защита от чужого — условие по организации в том же
   * запросе, который пишет.
   */
  replacePerformers(
    organizationId: string,
    serviceId: string,
    performers: PerformerInput[],
  ): Promise<void> {
    return this.db.transaction(async (tx) => {
      await tx.delete(staffServices).where(eq(staffServices.serviceId, serviceId));
      if (!performers.length) return;

      const own = await tx
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            isNull(organizationMembers.deletedAt),
            inArray(
              organizationMembers.id,
              performers.map((performer) => performer.organizationMemberId),
            ),
          ),
        );
      const allowed = new Set(own.map((row) => row.id));

      const rows = performers
        .filter((performer) => allowed.has(performer.organizationMemberId))
        .map((performer) => ({
          serviceId,
          organizationMemberId: performer.organizationMemberId,
          priceOverrideAmount: performer.priceOverrideAmount ?? null,
          durationOverrideMinutes: performer.durationOverrideMinutes ?? null,
        }));
      if (rows.length) await tx.insert(staffServices).values(rows);
    });
  }

  /**
   * Новая услуга достаётся всем, кто работает.
   *
   * Умолчание, а не решение за владелицу: до `staff_services` прайс
   * принадлежал организации и описывал каждого, и услуга, созданная без
   * исполнителей, была бы мертворождённой — записаться на неё нельзя ни к
   * кому. Сузить набор можно тут же, в форме услуги.
   */
  async attachAllMembers(organizationId: string, serviceId: string): Promise<void> {
    const members = await this.db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          isNull(organizationMembers.deletedAt),
          ne(organizationMembers.status, 'disabled'),
        ),
      );
    if (!members.length) return;

    /* Два запроса вместо `INSERT ... SELECT`: строк здесь столько же, сколько
       людей в салоне, и читаемость дороже одного похода в базу. */
    await this.db
      .insert(staffServices)
      .values(members.map((member) => ({ serviceId, organizationMemberId: member.id })))
      .onConflictDoNothing();
  }

  /** То же с другой стороны: пришедший в салон делает всё, пока не сказано иначе. */
  async attachAllServices(organizationId: string, organizationMemberId: string): Promise<void> {
    const rows = await this.db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.organizationId, organizationId), isNull(services.deletedAt)));
    if (!rows.length) return;

    await this.db
      .insert(staffServices)
      .values(rows.map((row) => ({ organizationMemberId, serviceId: row.id })))
      .onConflictDoNothing();
  }

  /** Сколько людей делает эту услугу — для пометки «от» в прайсе. */
  async countPerformers(serviceId: string): Promise<number> {
    const rows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(staffServices)
      .where(eq(staffServices.serviceId, serviceId));
    return rows[0]?.value ?? 0;
  }
}
