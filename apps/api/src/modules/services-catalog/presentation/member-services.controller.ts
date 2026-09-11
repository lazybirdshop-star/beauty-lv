import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DASHBOARD_ERROR_CODES } from '@amolie/shared-kernel';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { StaffServicesRepository } from '../infrastructure/staff-services.repository';
import { ReplaceMemberServicesDto } from './dto/replace-member-services.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/**
 * Услуги одного человека — со стороны его страницы в команде.
 *
 * Та же таблица `staff_services`, что у формы услуги, но вопрос обратный: не
 * «кто делает маникюр», а «что делает Юля». Администратор, пришедшая на
 * страницу нового мастера, иначе обходила бы каждую услугу прайса по очереди.
 *
 * Чтение — за правом на команду и чтение прайса: страница человека живёт в
 * разделе команды. Правка — за правкой прайса, как и у формы услуги.
 */
@Controller('organizations/:slug/team/:memberId/services')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
export class MemberServicesController {
  constructor(private readonly staffServices: StaffServicesRepository) {}

  @Get()
  @RequirePermissions('org:team:manage', 'org:services:read')
  async list(
    @Req() request: RequestWithOrgMembership,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    const { organizationId } = request.orgMembership!;
    await this.requireMember(organizationId, memberId);
    return this.staffServices.listForMember(organizationId, memberId);
  }

  @Put()
  @RequirePermissions('org:team:manage', 'org:services:manage')
  async replace(
    @Req() request: RequestWithOrgMembership,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: ReplaceMemberServicesDto,
  ) {
    const { organizationId } = request.orgMembership!;
    await this.requireMember(organizationId, memberId);

    /* Повторы схлопываются: две одинаковые галочки — одна услуга, а не
       конфликт уникального индекса. */
    const unique = new Map(dto.services.map((service) => [service.serviceId, service]));
    await this.staffServices.replaceForMember(organizationId, memberId, [...unique.values()]);
    return this.staffServices.listForMember(organizationId, memberId);
  }

  private async requireMember(organizationId: string, memberId: string): Promise<void> {
    if (await this.staffServices.isMember(organizationId, memberId)) return;
    throw new NotFoundException({
      message: 'Участника с таким идентификатором в организации нет',
      code: DASHBOARD_ERROR_CODES.memberNotFound,
    });
  }
}
