import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/presentation/auth.module';
import { ResendClient } from '../../notifications/infrastructure/resend.client';
import { ClientAccountService } from '../application/client-account.service';
import { ClientBookingsRepository } from '../infrastructure/client-bookings.repository';
import { ClientAccountController } from './client-account.controller';

/**
 * Личность клиента и его визиты.
 *
 * Аккаунтами и токенами по-прежнему владеет `AuthModule` — этот модуль их
 * потребляет, а не заводит свои: две таблицы пользователей и два вида
 * одноразовых ссылок разошлись бы в первом же правиле, которое поправят
 * только в одной из них.
 */
@Module({
  imports: [AuthModule],
  controllers: [ClientAccountController],
  providers: [ClientAccountService, ClientBookingsRepository, ResendClient],
})
export class ClientAccountModule {}
