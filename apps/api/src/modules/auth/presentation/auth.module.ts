import { Module } from '@nestjs/common';

import { AdminAnalyticsModule } from '../../admin-analytics/presentation/admin-analytics.module';
import { ResendClient } from '../../notifications/infrastructure/resend.client';
import { AccountMailService } from '../application/account-mail.service';
import { AuthService } from '../application/auth.service';
import { UserTokensRepository } from '../infrastructure/user-tokens.repository';
import { UsersRepository } from '../infrastructure/users.repository';
import { AuthController } from './auth.controller';

@Module({
  /* Журнал живёт в админ-модуле и экспортируется им. Зависимость только в
     эту сторону: панель про вход не знает ничего. */
  imports: [AdminAnalyticsModule],
  controllers: [AuthController],
  providers: [AuthService, AccountMailService, UsersRepository, UserTokensRepository, ResendClient],
  /* `ClientAccountModule` входит клиента теми же аккаунтами и теми же
     одноразовыми ссылками — свои завести означало бы получить два правила
     «использованный токен не годится» и поправить когда-нибудь одно. */
  exports: [AuthService, AccountMailService, UsersRepository, UserTokensRepository],
})
export class AuthModule {}
