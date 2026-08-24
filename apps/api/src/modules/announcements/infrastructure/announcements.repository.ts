import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';

import {
  announcementDismissals,
  announcements,
  type AnnouncementRow,
} from '../../../shared/database/schema/announcements';
import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { users } from '../../../shared/database/schema/users';
import type {
  AdminListPage,
  AdminListRange,
} from '../../admin-analytics/infrastructure/admin-list-query';

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

  async list(query: AdminListRange): Promise<AdminListPage<AdminAnnouncement>> {
    const [items, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: announcements.id,
          title: announcements.title,
          body: announcements.body,
          startsAt: announcements.startsAt,
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
        .where(isNull(announcements.deletedAt))
        .orderBy(desc(announcements.startsAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ value: count() }).from(announcements).where(isNull(announcements.deletedAt)),
    ]);

    return { items, total: totalRow?.value ?? 0 };
  }

  async create(input: {
    title: string;
    body: string;
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
