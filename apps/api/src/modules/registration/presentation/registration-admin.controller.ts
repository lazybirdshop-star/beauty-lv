import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { RegistrationService } from '../application/registration.service';
import { RegistrationRequestsRepository } from '../infrastructure/registration-requests.repository';
import { RegistrationRequestsQueryDto } from './dto/registration-requests.query.dto';
import { RejectRegistrationDto } from './dto/reject-registration.dto';

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

  @Post('registration-requests/:requestId/approve')
  @RequirePermissions('admin:registrations:manage')
  async approve(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    const account = await this.registration.approve(requestId, currentUser.sub);
    return { userId: account.user.id, organizationSlug: account.organizationSlug };
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
