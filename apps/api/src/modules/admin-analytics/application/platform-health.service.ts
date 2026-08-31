import { Injectable } from '@nestjs/common';

import { ResendClient } from '../../notifications/infrastructure/resend.client';
import { WebPushClient } from '../../notifications/infrastructure/web-push.client';
import { JobsRepository } from '../../jobs/infrastructure/jobs.repository';
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
  /**
   * Фоновые задачи: сколько ждёт, сколько исполняется, сколько умерло.
   *
   * `failed` здесь — главное число экрана: письмо о записи, исчерпавшее
   * попытки, выглядит на всех остальных экранах ровно как отправленное, и
   * узнают о нём по звонку клиента, который не получил подтверждения.
   */
  jobs: { pending: number; running: number; failed: number };
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
    private readonly jobs: JobsRepository,
  ) {}

  async collect(): Promise<PlatformHealth> {
    const [facts, jobs] = await Promise.all([this.facts.collect(), this.jobs.countByStatus()]);

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
      jobs: {
        pending: jobs.pending ?? 0,
        running: jobs.running ?? 0,
        failed: jobs.failed ?? 0,
      },
      activity: { bookingsLast24h: facts.bookingsLast24h },
    };
  }
}
