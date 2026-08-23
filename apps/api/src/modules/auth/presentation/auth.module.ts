import { Module } from '@nestjs/common';

import { ResendClient } from '../../notifications/infrastructure/resend.client';
import { AccountMailService } from '../application/account-mail.service';
import { AuthService } from '../application/auth.service';
import { RegistrationRepository } from '../infrastructure/registration.repository';
import { UserTokensRepository } from '../infrastructure/user-tokens.repository';
import { UsersRepository } from '../infrastructure/users.repository';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AccountMailService,
    UsersRepository,
    RegistrationRepository,
    UserTokensRepository,
    ResendClient,
  ],
  /* `ClientAccountModule` входит клиента теми же аккаунтами и теми же
     одноразовыми ссылками — свои завести означало бы получить два правила
     «использованный токен не годится» и поправить когда-нибудь одно. */
  exports: [AuthService, UsersRepository, UserTokensRepository],
})
export class AuthModule {}
