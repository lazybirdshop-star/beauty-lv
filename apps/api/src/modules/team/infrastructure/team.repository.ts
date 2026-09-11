import { Inject, Injectable } from '@nestjs/common';
import type { OrgRole } from '@amolie/shared-kernel';
import { and, count, eq, gte, inArray, isNull, lt, ne, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { bookings } from '../../../shared/database/schema/bookings';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { publishedSlots } from '../../../shared/database/schema/published-slots';
import { subscriptionPlans, subscriptions } from '../../../shared/database/schema/subscriptions';
import { users } from '../../../shared/database/schema/users';

export interface TeamMember {
  id: string;
  userId: string;
  role: OrgRole;
  status: 'active' | 'invited' | 'disabled';
  name: string;
  /** У клиентского аккаунта, повышенного до сотрудника, адрес всегда есть; поле
   *  само по себе необязательное — вход по ссылке этого не требует. */
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  /** Точка кадра снимка в процентах; `null` — центр. */
  avatarFocal: { x: number; y: number } | null;
  /** Записи этого человека на сегодня — то, что список показывает второй строкой. */
  bookingsToday: number;
}

/**
 * Состав организации: кто в ней есть, с какой ролью и в каком состоянии.
 *
 * Отдельно от `MembersRepository`, который отвечает за собственную строку
 * участника («моё лицо»): там нет и не должно быть чужих строк, здесь нет и не
 * должно быть правки себя без права `org:team:manage`.
 */
@Injectable()
export class TeamRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Список участников с числом сегодняшних визитов у каждого.
   *
   * Счёт визитов приходит одним запросом с группировкой, а не подзапросом на
   * строку: салон из пятнадцати человек иначе давал бы пятнадцать походов в
   * базу за одним экраном.
   */
  async list(organizationId: string, dayStart: Date, dayEnd: Date): Promise<TeamMember[]> {
    const rows = await this.db
      .select({
        id: organizationMembers.id,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        status: organizationMembers.status,
        displayName: organizationMembers.displayName,
        avatarUrl: organizationMembers.avatarUrl,
        avatarFocal: organizationMembers.avatarFocal,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          isNull(organizationMembers.deletedAt),
        ),
      )
      .orderBy(organizationMembers.createdAt);

    if (!rows.length) return [];

    /* Час визита живёт в окне, а не в записи: `bookings` знает, какое окно
       занято, а `published_slots` — когда оно начинается. Поэтому соединение,
       а не условие по колонке записи. */
    const counted = await this.db
      .select({ memberId: bookings.organizationMemberId, value: count() })
      .from(bookings)
      .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
      .where(
        and(
          eq(bookings.organizationId, organizationId),
          isNull(bookings.deletedAt),
          gte(publishedSlots.startsAt, dayStart),
          lt(publishedSlots.startsAt, dayEnd),
          inArray(bookings.status, ['pending', 'confirmed', 'completed']),
        ),
      )
      .groupBy(bookings.organizationMemberId);

    const today = new Map(counted.map((row) => [row.memberId, row.value]));

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      role: row.role,
      status: row.status,
      /* Имя в салоне может отличаться от имени в паспорте аккаунта — то, как
         человека зовут клиенты, задаёт организация. Пусто — имя аккаунта. */
      name: row.displayName?.trim() || row.fullName,
      email: row.email,
      phone: row.phone,
      avatarUrl: row.avatarUrl,
      /* Точка кадра едет вместе со снимком: без неё кружок в календаре обрезал
         бы лицо по центру, а не так, как его поставили. */
      avatarFocal: row.avatarFocal ?? null,
      bookingsToday: today.get(row.id) ?? 0,
    }));
  }

  /** Куда именно зовут: название и адрес нужны письму приглашения. */
  findOrganization(
    organizationId: string,
  ): Promise<{ id: string; name: string; slug: string; type: 'solo' | 'salon' } | null> {
    return this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        type: organizations.type,
      })
      .from(organizations)
      .where(and(eq(organizations.id, organizationId), isNull(organizations.deletedAt)))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  findById(organizationId: string, memberId: string) {
    return this.db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.organizationId, organizationId),
          isNull(organizationMembers.deletedAt),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  /**
   * Сколько людей организация занимает в лимите тарифа.
   *
   * Отстранённые не считаются: у них нет доступа, и держать за ними место
   * тарифа значило бы наказывать салон за то, что он никого не уволил
   * окончательно. Приглашённые считаются — место за ними уже забронировано,
   * иначе лимит обходился бы веером приглашений.
   */
  countOccupied(organizationId: string): Promise<number> {
    return this.db
      .select({ value: count() })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          isNull(organizationMembers.deletedAt),
          ne(organizationMembers.status, 'disabled'),
        ),
      )
      .then((rows) => rows[0]?.value ?? 0);
  }

  /** Сколько участников разрешает тариф. `null` — без ограничения (см. схему). */
  memberLimit(organizationId: string): Promise<number | null> {
    return this.db
      .select({ value: subscriptionPlans.memberLimit })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(
        and(eq(subscriptions.organizationId, organizationId), eq(subscriptions.status, 'active')),
      )
      .limit(1)
      .then((rows) => rows[0]?.value ?? null);
  }

  /** Сколько владельцев осталось — последнего снимать нельзя. */
  countOwners(organizationId: string): Promise<number> {
    return this.db
      .select({ value: count() })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.role, 'owner'),
          eq(organizationMembers.status, 'active'),
          isNull(organizationMembers.deletedAt),
        ),
      )
      .then((rows) => rows[0]?.value ?? 0);
  }

  async setRole(memberId: string, role: OrgRole) {
    const [row] = await this.db
      .update(organizationMembers)
      .set({ role, updatedAt: new Date() })
      .where(eq(organizationMembers.id, memberId))
      .returning();
    return row ?? null;
  }

  async setStatus(memberId: string, status: 'active' | 'disabled') {
    const [row] = await this.db
      .update(organizationMembers)
      .set({ status, updatedAt: new Date() })
      .where(eq(organizationMembers.id, memberId))
      .returning();
    return row ?? null;
  }

  async setDisplayName(memberId: string, displayName: string | null) {
    const [row] = await this.db
      .update(organizationMembers)
      .set({ displayName, updatedAt: new Date() })
      .where(eq(organizationMembers.id, memberId))
      .returning();
    return row ?? null;
  }

  /**
   * Есть ли за участником будущая работа.
   *
   * Спрашивается перед отстранением: отстранить человека, за которым стоят
   * записанные клиенты, — законное действие, но администратор обязан узнать
   * о них до, а не от клиента, приехавшего к закрытой двери.
   */
  countUpcomingBookings(memberId: string, from: Date): Promise<number> {
    return this.db
      .select({ value: count() })
      .from(bookings)
      .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
      .where(
        and(
          eq(bookings.organizationMemberId, memberId),
          isNull(bookings.deletedAt),
          gte(publishedSlots.startsAt, from),
          inArray(bookings.status, ['pending', 'confirmed']),
        ),
      )
      .then((rows) => rows[0]?.value ?? 0);
  }

  /** Членство человека в организации — чтобы не пригласить того, кто уже здесь. */
  findByUser(organizationId: string, userId: string) {
    return this.db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
          isNull(organizationMembers.deletedAt),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  async insertMember(input: {
    organizationId: string;
    userId: string;
    role: OrgRole;
    displayName: string | null;
  }) {
    const [row] = await this.db
      .insert(organizationMembers)
      .values({ ...input, status: 'active' })
      .returning();
    return row!;
  }

  /**
   * Возвращает отстранённого в строй, если он уже когда-то состоял здесь.
   *
   * Приглашение того, кто уже есть в организации, не заводит вторую строку:
   * уникальный индекс `(organization_id, user_id)` этого и не позволит, а
   * главное — история визитов человека привязана к строке членства, и вторая
   * разорвала бы её надвое.
   */
  async reviveMember(memberId: string, role: OrgRole, displayName: string | null) {
    const [row] = await this.db
      .update(organizationMembers)
      .set({
        role,
        status: 'active',
        displayName: displayName ?? sql`${organizationMembers.displayName}`,
        updatedAt: new Date(),
      })
      .where(eq(organizationMembers.id, memberId))
      .returning();
    return row!;
  }
}
