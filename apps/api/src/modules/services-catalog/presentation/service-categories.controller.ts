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
import { ServiceCategoriesRepository } from '../infrastructure/service-categories.repository';
import {
  ReorderServiceCategoriesDto,
  UpdateServiceCategoryDto,
  UpsertServiceCategoryDto,
} from './dto/upsert-service-category.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/**
 * Org-scoped CRUD for service categories (TASKS.md S-3). Guarded by the
 * existing `org:services:manage` permission rather than a new one — grouping
 * the catalogue is the same job as editing it, and a separate permission
 * nobody assigns would only be a way to lock masters out of their own menu.
 */
@Controller('organizations/:slug/service-categories')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
export class ServiceCategoriesController {
  constructor(private readonly categoriesRepository: ServiceCategoriesRepository) {}

  private organizationId(request: RequestWithOrgMembership): string {
    return request.orgMembership!.organizationId;
  }

  @Get()
  @RequirePermissions('org:services:manage')
  list(@Req() request: RequestWithOrgMembership) {
    return this.categoriesRepository.listForOrganization(this.organizationId(request));
  }

  @Post()
  @RequirePermissions('org:services:manage')
  create(@Req() request: RequestWithOrgMembership, @Body() dto: UpsertServiceCategoryDto) {
    return this.categoriesRepository.create(this.organizationId(request), dto);
  }

  /**
   * Reorder sits above `:categoryId` on purpose — Nest matches routes in
   * declaration order, and below it `PUT /reorder` would be swallowed by the
   * parameterised path.
   */
  @Put('reorder')
  @RequirePermissions('org:services:manage')
  async reorder(
    @Req() request: RequestWithOrgMembership,
    @Body() dto: ReorderServiceCategoriesDto,
  ) {
    await this.categoriesRepository.reorder(this.organizationId(request), dto.orderedIds);
    return this.categoriesRepository.listForOrganization(this.organizationId(request));
  }

  @Patch(':categoryId')
  @RequirePermissions('org:services:manage')
  async update(
    @Req() request: RequestWithOrgMembership,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateServiceCategoryDto,
  ) {
    const updated = await this.categoriesRepository.update(
      this.organizationId(request),
      categoryId,
      dto,
    );
    if (!updated) {
      throw new NotFoundException({
        message: 'Категория не найдена',
        code: DASHBOARD_ERROR_CODES.categoryNotFound,
      });
    }
    return updated;
  }

  @Delete(':categoryId')
  @RequirePermissions('org:services:manage')
  async remove(@Req() request: RequestWithOrgMembership, @Param('categoryId') categoryId: string) {
    const deleted = await this.categoriesRepository.softDelete(
      this.organizationId(request),
      categoryId,
    );
    if (!deleted) {
      throw new NotFoundException({
        message: 'Категория не найдена',
        code: DASHBOARD_ERROR_CODES.categoryNotFound,
      });
    }
    return { id: categoryId };
  }
}
