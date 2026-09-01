import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import {
  pushSubscriptions,
  type PushSubscriptionRow,
} from '../../../shared/database/schema/push-subscriptions';

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

@Injectable()
export class PushSubscriptionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Подписка приходит от браузера при каждом входе в кабинет, и почти всегда
   * это та же самая подписка. Поэтому upsert по `endpoint`, а не вставка:
   * иначе одно устройство накопило бы строку на каждый визит и получало бы
   * уведомление столько раз, сколько раз мастер открывала кабинет.
   *
   * `user_id` тоже перезаписывается. Endpoint принадлежит установке браузера,
   * а не человеку: если на общем планшете салона вошла другая мастер,
   * уведомления обязаны уйти ей, а не той, кто подписалась первой.
   *
   * Но перезаписывается **не по одному endpoint'у**. Адрес подписки не
   * секрет: он виден push-сервису, попадает в дампы браузера и остаётся на
   * том же общем планшете. Знающий его прежде присылал свои `p256dh`/`auth` и
   * уводил строку себе — мастер переставала получать уведомления о новых
   * записях и узнавала об этом, только не дождавшись ни одного.
   *
   * Поэтому строка переезжает к другому человеку, только если ключи те же,
   * что уже лежат в ней. Общий планшет это условие выполняет сам: браузер
   * отдаёт ту же подписку с теми же ключами, кто бы ни вошёл. Подделка — нет:
   * ключей чужой подписки у неё не будет, а собственные ключи означают
   * собственную подписку, у которой и endpoint другой. Своя же строка
   * обновляется всегда — ключи у подписки со временем меняются.
   */
  async save(userId: string, input: PushSubscriptionInput): Promise<void> {
    const now = new Date();

    await this.db
      .insert(pushSubscriptions)
      .values({
        userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent,
          lastSeenAt: now,
        },
        setWhere: sql`${pushSubscriptions.userId} = ${userId} or (${pushSubscriptions.p256dh} = ${input.p256dh} and ${pushSubscriptions.auth} = ${input.auth})`,
      });
  }

  listForUser(userId: string): Promise<PushSubscriptionRow[]> {
    return this.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  /** Отписка с этого устройства: чужой endpoint удалить нельзя. */
  async deleteForUser(userId: string, endpoint: string): Promise<void> {
    await this.db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
  }

  /**
   * Уборка адресов, о которых push-сервис сказал, что их больше нет. Без
   * привязки к пользователю: удаляется ровно то, что нам вернули как мёртвое.
   */
  async deleteExpired(endpoints: string[]): Promise<void> {
    if (endpoints.length === 0) return;

    await this.db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, endpoints));
  }
}
