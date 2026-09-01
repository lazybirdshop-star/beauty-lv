import { Module } from '@nestjs/common';

import { BookingMailService } from '../application/booking-mail.service';
import { BookingPushService } from '../application/booking-push.service';
import { RegistrationPushService } from '../application/registration-push.service';
import { BookingLetterRepository } from '../infrastructure/booking-letter.repository';
import { PushRecipientsRepository } from '../infrastructure/push-recipients.repository';
import { ResendClient } from '../infrastructure/resend.client';
import { PushSubscriptionsRepository } from '../infrastructure/push-subscriptions.repository';
import { WebPushClient } from '../infrastructure/web-push.client';
import { PushSubscriptionsController } from './push-subscriptions.controller';

/**
 * Уведомления вне интерфейса. Пока это push мастеру о новой записи; почта
 * живёт здесь же (`ResendClient`, `letters.ts`), но её провайдер регистрирует
 * `AuthModule` — письма отправляет он сам, и лишний общий модуль между ними
 * ничего бы не связал.
 *
 * `BookingPushService` и `BookingMailService` экспортируются наружу: их зовёт
 * модуль записей, и зависимость идёт только в эту сторону — уведомления не
 * знают про записи ничего, кроме переданных им фактов и идентификатора, по
 * которому сами читают остальное.
 *
 * Письма о визитах, в отличие от писем аккаунта, уходят **через очередь**:
 * недоступный провайдер не имеет права уронить саму запись.
 */
@Module({
  controllers: [PushSubscriptionsController],
  providers: [
    WebPushClient,
    PushSubscriptionsRepository,
    PushRecipientsRepository,
    BookingPushService,
    RegistrationPushService,
    BookingLetterRepository,
    /* Свой `ResendClient`, а не общий с `AuthModule`: провайдер без состояния,
       и делить его экземпляр между модулями значило бы связать их ради
       ничего. */
    ResendClient,
    BookingMailService,
  ],
  exports: [BookingPushService, RegistrationPushService, BookingMailService],
})
export class NotificationsModule {}
