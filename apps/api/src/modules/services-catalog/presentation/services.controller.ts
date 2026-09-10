import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
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
import { ServiceAddonsRepository } from '../infrastructure/service-addons.repository';
import { ServiceCategoriesRepository } from '../infrastructure/service-categories.repository';
import { ServicesRepository } from '../infrastructure/services.repository';
import { StaffServicesRepository } from '../infrastructure/staff-services.repository';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ReplacePerformersDto } from './dto/replace-performers.dto';
import { ReplaceServiceAddonsDto } from './dto/replace-service-addons.dto';
import { UpsertServiceDto } from './dto/upsert-service.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/** Org-scoped CRUD for the master's service catalog (TASKS.md MD-4). */
@Controller('organizations/:slug/services')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
export class ServicesController {
  constructor(
    private readonly servicesRepository: ServicesRepository,
    private readonly categoriesRepository: ServiceCategoriesRepository,
    private readonly addonsRepository: ServiceAddonsRepository,
    private readonly staffServices: StaffServicesRepository,
  ) {}

  /** `null` is a legitimate value — it detaches the service — and needs no check. */
  /**
   * Кто оказывает услугу и на каких условиях.
   *
   * Чтение — за `org:services:read`: наёмный мастер видит свой прайс, и
   * «кто ещё это делает» часть того же вопроса. Правка — за `manage`.
   */
  @Get(':serviceId/staff')
  @RequirePermissions('org:services:read')
  async listPerformers(
    @Req() request: RequestWithOrgMembership,
    @Param('serviceId') serviceId: string,
  ) {
    const organizationId = this.organizationId(request);
    await this.requireService(organizationId, serviceId);
    return this.staffServices.listPerformers(organizationId, serviceId);
  }

  @Put(':serviceId/staff')
  @RequirePermissions('org:services:manage')
  async replacePerformers(
    @Req() request: RequestWithOrgMembership,
    @Param('serviceId') serviceId: string,
    @Body() dto: ReplacePerformersDto,
  ) {
    const organizationId = this.organizationId(request);
    await this.requireService(organizationId, serviceId);

    /* Повторы схлопываются: форма шлёт набор галочек, и два одинаковых
       мастера в нём — это одна галочка, а не конфликт уникального индекса. */
    const seen = new Map(
      dto.performers.map((performer) => [performer.organizationMemberId, performer]),
    );
    await this.staffServices.replacePerformers(organizationId, serviceId, [...seen.values()]);
    return this.staffServices.listPerformers(organizationId, serviceId);
  }

  /** Услуга этой организации — или отказ теми же словами, что и везде. */
  private async requireService(organizationId: string, serviceId: string) {
    const service = await this.servicesRepository.findById(organizationId, serviceId);
    if (!service) {
      throw new NotFoundException({
        message: 'Услуга не найдена',
        code: DASHBOARD_ERROR_CODES.serviceNotFound,
      });
    }
    return service;
  }

  private async assertCategoryOwned(organizationId: string, categoryId?: string | null) {
    if (!categoryId) return;
    const owned = await this.categoriesRepository.belongsToOrganization(organizationId, categoryId);
    if (!owned) {
      throw new NotFoundException({
        message: 'Категория не найдена',
        code: DASHBOARD_ERROR_CODES.categoryNotFound,
      });
    }
  }

  private organizationId(request: RequestWithOrgMembership): string {
    return request.orgMembership!.organizationId;
  }

  @Get()
  @RequirePermissions('org:services:read')
  list(@Req() request: RequestWithOrgMembership) {
    return this.servicesRepository.listForOrganization(this.organizationId(request));
  }

  @Post()
  @RequirePermissions('org:services:manage')
  async create(@Req() request: RequestWithOrgMembership, @Body() dto: UpsertServiceDto) {
    const organizationId = this.organizationId(request);
    await this.assertCategoryOwned(organizationId, dto.categoryId);
    const service = await this.servicesRepository.create(organizationId, dto);

    /* Новая услуга достаётся всем, кто работает (SALON.md §4.4).
       Умолчание, а не решение за владелицу: услуга без исполнителей
       мертворождённая — записаться на неё нельзя ни к кому, — и до
       `staff_services` прайс описывал каждого. Сузить набор можно тут же. */
    await this.staffServices.attachAllMembers(organizationId, service.id);
    return service;
  }

  @Get(':serviceId/addons')
  @RequirePermissions('org:services:read')
  async listAddons(
    @Req() request: RequestWithOrgMembership,
    @Param('serviceId') serviceId: string,
  ) {
    const service = await this.servicesRepository.findById(this.organizationId(request), serviceId);
    if (!service) {
      throw new NotFoundException({
        message: 'Услуга не найдена',
        code: DASHBOARD_ERROR_CODES.serviceNotFound,
      });
    }
    return { addonServiceIds: await this.addonsRepository.listForService(serviceId) };
  }

  /**
   * Replaces the whole chain. `PUT` rather than `PATCH` on purpose — the
   * editor always sends the complete list, and pretending otherwise would
   * make "unchecked everything" indistinguishable from "sent nothing".
   */
  @Put(':serviceId/addons')
  @RequirePermissions('org:services:manage')
  async replaceAddons(
    @Req() request: RequestWithOrgMembership,
    @Param('serviceId') serviceId: string,
    @Body() dto: ReplaceServiceAddonsDto,
  ) {
    const organizationId = this.organizationId(request);
    const service = await this.servicesRepository.findById(organizationId, serviceId);
    if (!service) {
      throw new NotFoundException({
        message: 'Услуга не найдена',
        code: DASHBOARD_ERROR_CODES.serviceNotFound,
      });
    }

    const addonServiceIds = [...new Set(dto.addonServiceIds)].filter((id) => id !== serviceId);
    const owned = await this.addonsRepository.allBelongToOrganization(
      organizationId,
      addonServiceIds,
    );
    if (!owned) {
      throw new NotFoundException({
        message: 'Услуга не найдена',
        code: DASHBOARD_ERROR_CODES.serviceNotFound,
      });
    }

    await this.addonsRepository.replaceForService(serviceId, addonServiceIds);
    return { addonServiceIds };
  }

  @Patch(':serviceId')
  @RequirePermissions('org:services:manage')
  async update(
    @Req() request: RequestWithOrgMembership,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    const organizationId = this.organizationId(request);
    await this.assertCategoryOwned(organizationId, dto.categoryId);
    const updated = await this.servicesRepository.update(organizationId, serviceId, dto);
    if (!updated) {
      throw new NotFoundException({
        message: 'Услуга не найдена',
        code: DASHBOARD_ERROR_CODES.serviceNotFound,
      });
    }
    return updated;
  }

  @Delete(':serviceId')
  @RequirePermissions('org:services:manage')
  async remove(@Req() request: RequestWithOrgMembership, @Param('serviceId') serviceId: string) {
    const deleted = await this.servicesRepository.softDelete(
      this.organizationId(request),
      serviceId,
    );
    if (!deleted) {
      throw new NotFoundException({
        message: 'Услуга не найдена',
        code: DASHBOARD_ERROR_CODES.serviceNotFound,
      });
    }
    return { success: true };
  }
}
