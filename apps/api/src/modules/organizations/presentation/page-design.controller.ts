import { Body, Controller, Delete, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { PageDesignRepository } from '../infrastructure/page-design.repository';

import { PublishPageDesignDto, RollbackPageDesignDto } from './dto/page-design.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/**
 * Контракт Студии (DESIGN_STUDIO.md §7): черновик, публикация, история.
 *
 * Отдельный контроллер, а не пять методов в `OrganizationsController`: тот
 * обслуживает публичную страницу и профиль, а это — режим редактирования со
 * своим жизненным циклом и своими правами. Один и тот же охраняемый вход
 * (`org:profile-page:manage`) у обоих, но причины меняться разные.
 *
 * Тело запроса намеренно принимается как `unknown` и разбирается
 * `sanitizePageDesign` в репозитории, а не валидируется DTO по полям.
 * Правило одно и то же для любого клиента, оно измеримое (контраст,
 * каталоги) и живёт в `shared-kernel` рядом с резолвером, который рисует
 * страницу. Описание тех же ограничений декораторами было бы вторым
 * описанием одного контракта — и однажды разошлось бы с первым.
 */
@Controller('organizations/:slug/page-design')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
@RequirePermissions('org:profile-page:manage')
export class PageDesignController {
  constructor(private readonly pageDesignRepository: PageDesignRepository) {}

  @Get()
  getState(@Req() request: RequestWithOrgMembership) {
    return this.pageDesignRepository.getState(request.orgMembership!.organizationId);
  }

  /** Автосохранение черновика: пауза после последней правки — на стороне Студии. */
  @Put('draft')
  saveDraft(@Req() request: RequestWithOrgMembership, @Body() body: unknown) {
    return this.pageDesignRepository.saveDraft(request.orgMembership!.organizationId, body);
  }

  /** «Вернуться к опубликованному» (§7.3). */
  @Delete('draft')
  discardDraft(@Req() request: RequestWithOrgMembership) {
    return this.pageDesignRepository.discardDraft(request.orgMembership!.organizationId);
  }

  @Post('publish')
  publish(
    @Req() request: RequestWithOrgMembership,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: PublishPageDesignDto,
  ) {
    return this.pageDesignRepository.publish(
      request.orgMembership!.organizationId,
      currentUser.sub,
      dto.design,
    );
  }

  /** Откат — новая публикация старого слепка, а не переписывание истории. */
  @Post('rollback')
  rollback(
    @Req() request: RequestWithOrgMembership,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: RollbackPageDesignDto,
  ) {
    return this.pageDesignRepository.rollback(
      request.orgMembership!.organizationId,
      currentUser.sub,
      dto.version,
    );
  }
}
