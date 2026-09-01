import { Injectable, Logger } from '@nestjs/common';

import { resolveNotificationLocale } from '../domain/notification-locale';
import { PushRecipientsRepository } from '../infrastructure/push-recipients.repository';
import { PushSubscriptionsRepository } from '../infrastructure/push-subscriptions.repository';
import { WebPushClient } from '../infrastructure/web-push.client';
import {
  cancelledByClientMessage,
  newBookingMessage,
  rescheduledByClientMessage,
} from './push-messages';

/**
 * Всё, что модуль записей знает о событии, и ничего сверх того.
 *
 * Мастера здесь нет — только участник организации, на чей календарь пришла
 * запись. Кто он, на каком языке читает и в каком поясе живёт салон,
 * выясняют уведомления: иначе модуль записей пришлось бы научить читать
 * пользователей и организации ради того, что его не касается.
 */
export interface NewBookingNotification {
  organizationMemberId: string;
  bookingId: string;
  clientName: string;
  startsAt: Date;
  serviceNames: string[];
}

/**
 * Уведомления мастеру о событиях её календаря.
 *
 * **Ни один метод не бросает исключений.** Запись клиента — событие, а
 * уведомление — его следствие: недоступный FCM не может отменить визит,
 * который уже в базе. Поэтому вызывающий пишет `void notifyNewBooking(...)`
 * и не ждёт ответа — гость не должен стоять на экране оформления, пока Apple
 * принимает наш запрос.
 *
 * Очереди с повторами тут нет намеренно (TASKS.md N-1). Пока её нет,
 * недоставленное уведомление теряется, и это честная цена: push — быстрый
 * слой поверх кабинета, а не канал, на который можно положиться. Гарантию
 * даёт сам кабинет, где запись видна всегда.
 */
@Injectable()
export class BookingPushService {
  private readonly logger = new Logger(BookingPushService.name);

  constructor(
    private readonly recipients: PushRecipientsRepository,
    private readonly subscriptions: PushSubscriptionsRepository,
    private readonly webPush: WebPushClient,
  ) {}

  async notifyNewBooking(input: NewBookingNotification): Promise<void> {
    return this.notify(input, newBookingMessage);
  }

  /**
   * Клиент отменил визит сам. Мастер узнаёт об этом так же немедленно, как о
   * новой записи: освободившийся час продаётся, только пока он не прошёл.
   */
  async notifyCancelledByClient(input: NewBookingNotification): Promise<void> {
    return this.notify(input, cancelledByClientMessage);
  }

  /**
   * Клиент перенёс визит сам. Мастер узнаёт немедленно и по той же причине:
   * старый час освободился и продаётся, только пока не прошёл, а новый — её
   * время, о котором она ещё не знает.
   */
  async notifyRescheduledByClient(input: NewBookingNotification): Promise<void> {
    return this.notify(input, rescheduledByClientMessage);
  }

  private async notify(
    input: NewBookingNotification,
    compose: typeof newBookingMessage,
  ): Promise<void> {
    try {
      // Ключей нет — уведомления в этой установке не настроены. Ни запроса к
      // базе, ни строчки в логе на каждую запись: это конфигурация, а не сбой,
      // и о ней уже сказано один раз при старте.
      if (!this.webPush.publicKey) return;

      const recipient = await this.recipients.findByOrganizationMember(input.organizationMemberId);
      if (!recipient) {
        this.logger.warn(`No recipient for organization member ${input.organizationMemberId}`);
        return;
      }

      const targets = await this.subscriptions.listForUser(recipient.userId);
      if (targets.length === 0) return;

      const message = compose(resolveNotificationLocale(recipient.locale), {
        clientName: input.clientName,
        startsAt: input.startsAt,
        serviceNames: input.serviceNames,
        timeZone: recipient.timeZone,
        organizationSlug: recipient.organizationSlug,
        bookingId: input.bookingId,
      });

      /* Параллельно, а не по очереди: у мастера может быть телефон, планшет и
         рабочий ноутбук, и медленный ответ одного push-сервиса не повод
         задерживать остальные. */
      const results = await Promise.all(
        targets.map(async (target) => ({
          endpoint: target.endpoint,
          result: await this.webPush.send(target, message),
        })),
      );

      const expired = results
        .filter(({ result }) => result === 'expired')
        .map(({ endpoint }) => endpoint);

      await this.subscriptions.deleteExpired(expired);
    } catch (error) {
      /* Последний рубеж: сюда попадает только то, что не предусмотрено —
         недоступная база, например. Клиент уже записан, и об этом никто не
         должен узнать через ошибку на экране записи. */
      this.logger.error(`Failed to notify about booking ${input.bookingId}: ${String(error)}`);
    }
  }
}
