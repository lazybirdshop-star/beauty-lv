import { Module } from '@nestjs/common';

import { AdminAnalyticsModule } from '../../admin-analytics/presentation/admin-analytics.module';
import { AuthModule } from '../../auth/presentation/auth.module';
import { NotificationsModule } from '../../notifications/presentation/notifications.module';
import { ResendClient } from '../../notifications/infrastructure/resend.client';
import { PlatformSettingsRepository } from '../../platform-settings/infrastructure/platform-settings.repository';
import { RegistrationService } from '../application/registration.service';
import { MasterAccountRepository } from '../infrastructure/master-account.repository';
import { RegistrationRequestsRepository } from '../infrastructure/registration-requests.repository';
import { RegistrationAdminController } from './registration-admin.controller';
import { RegistrationController } from './registration.controller';

/**
 * Кого платформа впускает и на каких условиях.
 *
 * Зависимость строго в одну сторону: регистрация знает про вход (ей нужно
 * выдать токен тому, кого только что завела) — вход про регистрацию не знает
 * ничего. Поэтому маршрут `/auth/register` объявлен здесь, а не там: имя пути
 * принадлежит человеку, который регистрируется, а решение — этому модулю.
 */
@Module({
  imports: [AuthModule, NotificationsModule, AdminAnalyticsModule],
  controllers: [RegistrationController, RegistrationAdminController],
  providers: [
    RegistrationService,
    RegistrationRequestsRepository,
    MasterAccountRepository,
    PlatformSettingsRepository,
    ResendClient,
  ],
  exports: [RegistrationRequestsRepository],
})
export class RegistrationModule {}
