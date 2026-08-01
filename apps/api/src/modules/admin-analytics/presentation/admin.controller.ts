import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { AdminRepository } from '../infrastructure/admin.repository';

/** See API.md §6.8. Permission-gated, not raw-role-gated — see shared/auth. */
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private readonly adminRepository: AdminRepository) {}

  @Get('organizations')
  @RequirePermissions('admin:masters:manage')
  organizations() {
    return this.adminRepository.listOrganizations();
  }

  @Get('invite-codes')
  @RequirePermissions('admin:masters:manage')
  inviteCodes() {
    return this.adminRepository.listInviteCodes();
  }

  @Get('summary')
  @RequirePermissions('admin:masters:manage')
  summary() {
    return this.adminRepository.getDashboardSummary();
  }
}
