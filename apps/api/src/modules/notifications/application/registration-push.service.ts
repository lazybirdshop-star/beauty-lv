import { Injectable, Logger } from '@nestjs/common';

import { resolveNotificationLocale } from '../domain/notification-locale';
import { PushRecipientsRepository } from '../infrastructure/push-recipients.repository';
import { PushSubscriptionsRepository } from '../infrastructure/push-subscriptions.repository';
import { WebPushClient } from '../infrastructure/web-push.client';
import { newRegistrationRequestMessage } from './push-messages';

/**
 * Уведомление администраторам платформы о новой заявке.
 *
 * **Не бросает исключений** — то же правило, что у уведомлений о записях:
 * заявка уже в базе, и недоступный push-сервис не может отменить её подачу.
 * Вызывающий пишет `void notifyNewRequest(...)` и не ждёт ответа: человек,
 * нажавший «Отправить», не должен стоять на экране, пока Apple принимает наш
 * запрос.
 */
@Injectable()
export class RegistrationPushService {
  private readonly logger = new Logger(RegistrationPushService.name);

  constructor(
    private readonly recipients: PushRecipientsRepository,
    private readonly subscriptions: PushSubscriptionsRepository,
    private readonly webPush: WebPushClient,
  ) {}

  async notifyNewRequest(input: { requestId: string; fullName: string }): Promise<void> {
    try {
      // Ключей нет — уведомления в этой установке не настроены. Ни запроса к
      // базе, ни строчки в логе: это конфигурация, а не сбой.
      if (!this.webPush.publicKey) return;

      const admins = await this.recipients.findPlatformAdmins();
      if (admins.length === 0) return;

      const expired: string[] = [];

      /* Администраторов немного, но устройств у каждого может быть несколько,
         и все они опрашиваются параллельно: медленный ответ одного
         push-сервиса не повод задерживать остальные. */
      await Promise.all(
        admins.map(async (admin) => {
          const targets = await this.subscriptions.listForUser(admin.userId);
          const message = newRegistrationRequestMessage(resolveNotificationLocale(admin.locale), {
            requestId: input.requestId,
            fullName: input.fullName,
          });

          const results = await Promise.all(
            targets.map(async (target) => ({
              endpoint: target.endpoint,
              result: await this.webPush.send(target, message),
            })),
          );

          expired.push(
            ...results.filter(({ result }) => result === 'expired').map(({ endpoint }) => endpoint),
          );
        }),
      );

      await this.subscriptions.deleteExpired(expired);
    } catch (error) {
      /* Последний рубеж: сюда попадает только непредвиденное — недоступная
         база, например. Заявка уже принята, и заявитель не должен узнать об
         этом через ошибку на экране. */
      this.logger.error(
        `Failed to notify admins about request ${input.requestId}: ${String(error)}`,
      );
    }
  }
}
