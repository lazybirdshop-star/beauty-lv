import { Module } from '@nestjs/common';

import { BookingPushService } from '../application/booking-push.service';
import { RegistrationPushService } from '../application/registration-push.service';
import { PushRecipientsRepository } from '../infrastructure/push-recipients.repository';
import { PushSubscriptionsRepository } from '../infrastructure/push-subscriptions.repository';
import { WebPushClient } from '../infrastructure/web-push.client';
import { PushSubscriptionsController } from './push-subscriptions.controller';

/**
 * Уведомления вне интерфейса. Пока это push мастеру о новой записи; почта
 * живёт здесь же (`ResendClient`, `letters.ts`), но её провайдер регистрирует
 * `AuthModule` — письма отправляет он сам, и лишний общий модуль между ними
 * ничего бы не связал.
 *
 * `BookingPushService` экспортируется наружу: его зовёт модуль записей, и
 * зависимость идёт только в эту сторону — уведомления не знают про записи
 * ничего, кроме переданных им фактов.
 */
@Module({
  controllers: [PushSubscriptionsController],
  providers: [
    WebPushClient,
    PushSubscriptionsRepository,
    PushRecipientsRepository,
    BookingPushService,
    RegistrationPushService,
  ],
  exports: [BookingPushService, RegistrationPushService],
})
export class NotificationsModule {}
