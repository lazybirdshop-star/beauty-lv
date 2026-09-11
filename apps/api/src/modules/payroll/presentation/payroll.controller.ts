import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DASHBOARD_ERROR_CODES, ORG_ROLE_PERMISSIONS, resolveScope } from '@amolie/shared-kernel';
import type { Request } from 'express';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { PayrollRuleError, PayrollService } from '../application/payroll.service';
import { CalculatePayoutsDto, CreateCompensationDto, ListPayoutsDto } from './dto/payroll.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/**
 * Проценты и ведомость — SALON.md §7.2–§7.4.
 *
 * Кто что видит:
 * - владелица (`org:finance:manage`) ставит условия, считает, утверждает и
 *   отмечает выплату — у всех;
 * - наёмный мастер (`org:finance:read`, область «своё») видит свои условия и
 *   свои утверждённые и выплаченные ведомости; черновик — нет: это расчёт,
 *   который владелица ещё может поменять, а не обещание денег;
 * - администратор салона — ничего: у его роли прямо сказано «без выплат», и
 *   `org:finance:read` в области организации открывает ему только сводку
 *   дохода, а не деньги людей.
 */
@Controller('organizations/:slug')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  private viewScope(request: RequestWithOrgMembership): {
    onlyMemberId?: string;
    includeDrafts: boolean;
  } {
    const membership = request.orgMembership!;
    if (resolveScope(membership.role, 'org:finance:read') === 'own') {
      return { onlyMemberId: membership.organizationMemberId, includeDrafts: false };
    }
    if (ORG_ROLE_PERMISSIONS[membership.role].includes('org:finance:manage')) {
      return { includeDrafts: true };
    }
    throw new ForbiddenException({
      message: 'Выплаты видит владелец заведения',
      code: DASHBOARD_ERROR_CODES.payrollForbidden,
    });
  }

  @Get('compensation')
  @RequirePermissions('org:finance:read')
  listCompensation(@Req() request: RequestWithOrgMembership) {
    const { onlyMemberId } = this.viewScope(request);
    return this.payroll.listCompensation(request.orgMembership!.organizationId, onlyMemberId);
  }

  @Post('compensation')
  @RequirePermissions('org:finance:manage')
  createCompensation(
    @Req() request: RequestWithOrgMembership,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCompensationDto,
  ) {
    return this.run(() =>
      this.payroll.setCompensation(
        request.orgMembership!.organizationId,
        { sub: user.sub, imp: user.imp },
        dto,
      ),
    );
  }

  @Get('payouts')
  @RequirePermissions('org:finance:read')
  listPayouts(@Req() request: RequestWithOrgMembership, @Query() query: ListPayoutsDto) {
    return this.payroll.listPayouts(request.orgMembership!.organizationId, {
      ...this.viewScope(request),
      from: query.from,
      to: query.to,
    });
  }

  @Post('payouts/calculate')
  @RequirePermissions('org:finance:manage')
  calculate(
    @Req() request: RequestWithOrgMembership,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CalculatePayoutsDto,
  ) {
    return this.run(() =>
      this.payroll.calculate(
        request.orgMembership!.organizationId,
        { sub: user.sub, imp: user.imp },
        dto.periodStart,
        dto.periodEnd,
      ),
    );
  }

  @Patch('payouts/:payoutId/approve')
  @RequirePermissions('org:finance:manage')
  async approve(
    @Req() request: RequestWithOrgMembership,
    @CurrentUser() user: AuthenticatedUser,
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
  ) {
    await this.run(() =>
      this.payroll.approve(
        request.orgMembership!.organizationId,
        { sub: user.sub, imp: user.imp },
        payoutId,
      ),
    );
    return { success: true };
  }

  @Patch('payouts/:payoutId/paid')
  @RequirePermissions('org:finance:manage')
  async markPaid(
    @Req() request: RequestWithOrgMembership,
    @CurrentUser() user: AuthenticatedUser,
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
  ) {
    await this.run(() =>
      this.payroll.markPaid(
        request.orgMembership!.organizationId,
        { sub: user.sub, imp: user.imp },
        payoutId,
      ),
    );
    return { success: true };
  }

  @Delete('payouts/:payoutId')
  @RequirePermissions('org:finance:manage')
  async deleteDraft(
    @Req() request: RequestWithOrgMembership,
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
  ) {
    await this.run(() => this.payroll.deleteDraft(request.orgMembership!.organizationId, payoutId));
    return { success: true };
  }

  /** Доменные отказы — в HTTP с кодом в теле: по статусу их не различить. */
  private async run<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (!(error instanceof PayrollRuleError)) throw error;
      const body = { message: error.message, code: error.code };
      if (
        error.code === DASHBOARD_ERROR_CODES.memberNotFound ||
        error.code === DASHBOARD_ERROR_CODES.payoutNotFound
      ) {
        throw new NotFoundException(body);
      }
      if (error.code === DASHBOARD_ERROR_CODES.payoutLocked) throw new ConflictException(body);
      throw new BadRequestException(body);
    }
  }
}
