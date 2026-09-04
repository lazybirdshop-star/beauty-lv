import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';

import {
  announcementDismissals,
  announcements,
  type AnnouncementRow,
} from '../../../shared/database/schema/announcements';
import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { users } from '../../../shared/database/schema/users';
import type {
  AdminListPage,
  AdminListRange,
} from '../../admin-analytics/infrastructure/admin-list-query';

/** Где объявление относительно текущего момента. */
export const ANNOUNCEMENT_STATES = ['live', 'scheduled', 'ended'] as const;
export type AnnouncementState = (typeof ANNOUNCEMENT_STATES)[number];

export interface AdminAnnouncement extends AnnouncementRow {
  authorName: string | null;
  /** Сколько мастеров уже закрыли объявление — единственная мера «дошло ли». */
  dismissedBy: number;
}

export interface MasterAnnouncement {
  id: string;
  title: string;
  body: string;
}

/** Состоит ли человек хотя бы в одной организации с командой. */
function inSalon(userId: string) {
  return sql`exists (
    select 1 from ${organizationMembers}
    join ${organizations} on ${organizations.id} = ${organizationMembers.organizationId}
    where ${organizationMembers.userId} = ${userId}
      and ${organizationMembers.status} = 'active'
      and ${organizationMembers.deletedAt} is null
      and ${organizations.deletedAt} is null
      and ${organizations.type} = 'salon'
  )`;
}

@Injectable()
export class AnnouncementsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Что мастер должна увидеть прямо сейчас.
   *
   * Три условия сразу: объявление живо, его отрезок времени идёт, и она его
   * ещё не закрывала. Прочитанное не возвращается — ни завтра, ни с другого
   * устройства: отметка живёт на сервере, а не в браузере.
   */
  activeFor(userId: string): Promise<MasterAnnouncement[]> {
    const now = new Date();

    return this.db
      .select({
        id: announcements.id,
        title: announcements.title,
        body: announcements.body,
      })
      .from(announcements)
      .leftJoin(
        announcementDismissals,
        and(
          eq(announcementDismissals.announcementId, announcements.id),
          eq(announcementDismissals.userId, userId),
        ),
      )
      .where(
        and(
          isNull(announcements.deletedAt),
          lte(announcements.startsAt, now),
          or(isNull(announcements.endsAt), gt(announcements.endsAt, now)),
          isNull(announcementDismissals.announcementId),
          /* Адресат: «салонам» получает тот, кто состоит хотя бы в одной
             организации с командой, «мастерам» — все остальные. Объявление
             про сотрудников не должно приходить мастеру-одиночке, у которой
             сотрудников нет. */
          or(
            eq(announcements.audience, 'all'),
            and(eq(announcements.audience, 'salons'), sql`${inSalon(userId)}`),
            and(eq(announcements.audience, 'masters'), sql`not ${inSalon(userId)}`),
          ),
        ),
      )
      .orderBy(desc(announcements.startsAt));
  }

  /**
   * Отметка «прочитано». Повтор — не ошибка: две вкладки закрывают одно и то
   * же объявление одновременно, и вторая не должна получить 500.
   */
  async dismiss(announcementId: string, userId: string): Promise<void> {
    await this.db
      .insert(announcementDismissals)
      .values({ announcementId, userId })
      .onConflictDoNothing();
  }

  async list(
    query: AdminListRange & {
      /** `live` — идёт сейчас, `scheduled` — ещё не началось, `ended` — прошло. */
      state?: AnnouncementState;
      audience?: AnnouncementRow['audience'];
    },
  ): Promise<AdminListPage<AdminAnnouncement>> {
    const now = new Date();

    const where = and(
      isNull(announcements.deletedAt),
      query.audience ? eq(announcements.audience, query.audience) : undefined,
      query.state === 'scheduled' ? gt(announcements.startsAt, now) : undefined,
      query.state === 'live'
        ? and(
            lte(announcements.startsAt, now),
            or(isNull(announcements.endsAt), gt(announcements.endsAt, now)),
          )
        : undefined,
      query.state === 'ended' ? lte(announcements.endsAt, now) : undefined,
    );

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: announcements.id,
          title: announcements.title,
          body: announcements.body,
          startsAt: announcements.startsAt,
          audience: announcements.audience,
          endsAt: announcements.endsAt,
          createdByUserId: announcements.createdByUserId,
          createdAt: announcements.createdAt,
          updatedAt: announcements.updatedAt,
          deletedAt: announcements.deletedAt,
          authorName: users.fullName,
          dismissedBy: sql<number>`(
            select count(*)::int from ${announcementDismissals}
            where ${announcementDismissals.announcementId} = ${announcements.id}
          )`,
        })
        .from(announcements)
        .leftJoin(users, eq(users.id, announcements.createdByUserId))
        .where(where)
        .orderBy(desc(announcements.startsAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ value: count() }).from(announcements).where(where),
    ]);

    return { items, total: totalRow?.value ?? 0 };
  }

  async create(input: {
    title: string;
    body: string;
    audience?: AnnouncementRow['audience'];
    startsAt?: Date;
    endsAt?: Date;
    createdByUserId: string;
  }): Promise<AnnouncementRow> {
    const [row] = await this.db.insert(announcements).values(input).returning();
    return row!;
  }

  /**
   * Снятие объявления — мягкое удаление, а не `DELETE`.
   *
   * Отметки «прочитано» ссылаются на строку, и жёсткое удаление либо упало бы
   * на внешнем ключе, либо унесло бы вместе с объявлением ответ на вопрос
   * «сколько людей его видели».
   */
  async remove(announcementId: string): Promise<AnnouncementRow | null> {
    const [row] = await this.db
      .update(announcements)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(announcements.id, announcementId), isNull(announcements.deletedAt)))
      .returning();
    return row ?? null;
  }
}
