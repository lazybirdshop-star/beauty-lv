import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import {
  OrganizationsRepository,
  type DashboardSummary,
} from '../infrastructure/organizations.repository';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsRepository: OrganizationsRepository) {}

  /** Stand-in for the real `GET /organizations/me` (API.md §6.1). */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() currentUser: AuthenticatedUser) {
    const organization = await this.organizationsRepository.findMineForUser(currentUser.sub);
    if (!organization) {
      throw new NotFoundException('Вы пока не состоите ни в одной организации');
    }
    return organization;
  }

  /**
   * Master dashboard-home metrics. Honestly zeroed where the source table
   * doesn't exist yet (bookings/clients — see the dashboard-architecture
   * plan, Modules 2-4) rather than faking data.
   */
  @Get('me/summary')
  @UseGuards(JwtAuthGuard)
  async summary(@CurrentUser() currentUser: AuthenticatedUser): Promise<DashboardSummary> {
    const organization = await this.organizationsRepository.findMineForUser(currentUser.sub);
    if (!organization) {
      throw new NotFoundException('Вы пока не состоите ни в одной организации');
    }
    return this.organizationsRepository.getDashboardSummary();
  }
}
