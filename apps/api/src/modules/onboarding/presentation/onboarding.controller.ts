import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { OnboardingService } from '../application/onboarding.service';

/**
 * Top-level `/onboarding` rather than `/organizations/...` on purpose: the
 * organizations controller owns `:slug`, and every route added under it has to
 * be defended against being read as a master's public address. This one is
 * about the caller, never about a named organization.
 */
@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  status(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.onboardingService.getStatus(currentUser.sub);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  complete(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.onboardingService.complete(currentUser.sub);
  }

  @Post('restart')
  @HttpCode(HttpStatus.OK)
  restart(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.onboardingService.restart(currentUser.sub);
  }
}
