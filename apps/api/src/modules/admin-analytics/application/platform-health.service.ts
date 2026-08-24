import { Injectable } from '@nestjs/common';

import { ResendClient } from '../../notifications/infrastructure/resend.client';
import { WebPushClient } from '../../notifications/infrastructure/web-push.client';
import { PlatformHealthRepository } from '../infrastructure/platform-health.repository';

export interface PlatformHealth {
  database: 'ok';
  mail: { configured: boolean };
  push: {
    configured: boolean;
    /** Администраторов всего и скольких из них уведомление реально найдёт. */
    admins: number;
    adminsReachable: number;
    subscriptions: number;
  };
  queue: { pendingRequests: number };
  activity: { bookingsLast24h: number };
}

/**
 * Состояние платформы — ответ на вопрос «работает ли то, о чём я узнаю только
 * по жалобе».
 *
 * Молчащая почта и невыданные ключи push выглядят на всех остальных экранах
 * ровно как исправная работа: писем не приходит, уведомлений нет, и первым об
 * этом узнаёт мастер, не получившая ответа на заявку. Здесь это сказано
 * прямо.
 *
 * Ничего похожего на «последние ошибки» тут нет намеренно: продукт их не
 * хранит, и показывать пустой список ошибок значило бы обещать наблюдение,
 * которого нет.
 */
@Injectable()
export class PlatformHealthService {
  constructor(
    private readonly facts: PlatformHealthRepository,
    private readonly webPush: WebPushClient,
    private readonly mail: ResendClient,
  ) {}

  async collect(): Promise<PlatformHealth> {
    const facts = await this.facts.collect();

    return {
      database: 'ok',
      mail: { configured: this.mail.configured },
      push: {
        configured: Boolean(this.webPush.publicKey),
        admins: facts.admins,
        adminsReachable: facts.adminsReachable,
        subscriptions: facts.pushSubscriptions,
      },
      queue: { pendingRequests: facts.pendingRequests },
      activity: { bookingsLast24h: facts.bookingsLast24h },
    };
  }
}
