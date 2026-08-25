import {
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { DASHBOARD_ERROR_CODES } from '@amolie/shared-kernel';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { AccountNotUpgradableError } from '../application/account-upgrade.service';
import { RegistrationService } from '../application/registration.service';
import { EmailTakenError, PhoneTakenError } from '../infrastructure/master-account.repository';
import { RegistrationRequestsRepository } from '../infrastructure/registration-requests.repository';
import { RegistrationRequestsQueryDto } from './dto/registration-requests.query.dto';
import { RejectRegistrationDto } from './dto/reject-registration.dto';

/** Чем закончилось одобрение — в том виде, в каком это читает панель. */
export type ApproveResponse =
  | { mode: 'created'; userId: string; organizationSlug: string }
  | { mode: 'confirmation-sent'; email: string };

/** Очередь заявок в админ-панели. Отдельный контроллер: у него другая аудитория и другой guard. */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RegistrationAdminController {
  constructor(
    private readonly registration: RegistrationService,
    private readonly requests: RegistrationRequestsRepository,
  ) {}

  @Get('registration-requests')
  @RequirePermissions('admin:registrations:manage')
  list(@Query() query: RegistrationRequestsQueryDto) {
    return this.requests.list(query);
  }

  /**
   * Число ожидающих — для значка в меню.
   *
   * Отдельным маршрутом, а не полем списка: значок нужен на каждом экране
   * панели, и тянуть ради него всю первую страницу очереди значило бы
   * запрашивать пятьдесят заявок, чтобы показать одну цифру.
   */
  @Get('registration-requests/pending-count')
  @RequirePermissions('admin:registrations:manage')
  async pendingCount(): Promise<{ count: number }> {
    return { count: await this.requests.countPending() };
  }

  /**
   * Одобрение. Два исхода, и панель обязана их различать: кабинет заведён
   * прямо сейчас — или заведётся, когда человек подтвердит переход по ссылке
   * из письма. Второе выглядит на экране как «ничего не произошло», если о
   * нём не сказать.
   */
  @Post('registration-requests/:requestId/approve')
  @RequirePermissions('admin:registrations:manage')
  async approve(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ): Promise<ApproveResponse> {
    try {
      const outcome = await this.registration.approve(requestId, currentUser.sub);

      return outcome.mode === 'created'
        ? {
            mode: 'created',
            userId: outcome.account.user.id,
            organizationSlug: outcome.account.organizationSlug,
          }
        : { mode: 'confirmation-sent', email: outcome.email };
    } catch (error) {
      /*
       * Занятый адрес или телефон — это конфликт, а не поломка сервера.
       * Раньше эти отказы долетали сюда обычным `Error` и превращались в 500:
       * администратор нажимал «Одобрить» и не узнавал ни что не вышло, ни
       * почему. Заявка при этом уже вернулась в очередь — повторять нечего,
       * нужно решение человека.
       *
       * Рядом с фразой едет код: панель говорит на трёх языках, а `message`
       * написан по-русски (см. `DASHBOARD_ERROR_CODES`).
       */
      if (error instanceof AccountNotUpgradableError) {
        throw new ConflictException({ message: error.message, code: error.code });
      }
      if (error instanceof EmailTakenError) {
        throw new ConflictException({
          message: error.message,
          code: DASHBOARD_ERROR_CODES.registrationEmailTaken,
        });
      }
      if (error instanceof PhoneTakenError) {
        throw new ConflictException({
          message: error.message,
          code: DASHBOARD_ERROR_CODES.registrationPhoneTaken,
        });
      }
      throw error;
    }
  }

  @Post('registration-requests/:requestId/reject')
  @RequirePermissions('admin:registrations:manage')
  async reject(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: RejectRegistrationDto,
  ): Promise<{ success: true }> {
    await this.registration.reject(requestId, currentUser.sub, dto.reason);
    return { success: true };
  }
}
