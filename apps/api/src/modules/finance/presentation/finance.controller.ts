import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { parseTimeWindow, TimeWindowDto } from '../../../shared/validation/time-window.dto';
import { FinanceRepository } from '../infrastructure/finance.repository';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/**
 * Revenue reporting for the master's own organization.
 *
 * This is **not accounting**: the product has no payments module, so these
 * figures are the price snapshots of bookings she marked `completed`. The
 * UI says so explicitly — a number that looks like bookkeeping but isn't
 * would be worse than no number.
 */
@Controller('organizations/:slug/finance-summary')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
export class FinanceController {
  constructor(private readonly financeRepository: FinanceRepository) {}

  /**
   * Отрезок необязателен: без него — за всё время, как и было.
   *
   * Границы приходят готовыми метками времени, потому что месяц мастера
   * начинается в полночь её салона, а не сервера, — то же правило, что у
   * списков записей и окон (см. `TimeWindowDto`).
   */
  @Get()
  @RequirePermissions('org:bookings:manage')
  summary(@Req() request: RequestWithOrgMembership, @Query() window: TimeWindowDto) {
    return this.financeRepository.getSummary(
      request.orgMembership!.organizationId,
      parseTimeWindow(window),
    );
  }
}
