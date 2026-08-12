import { Module } from '@nestjs/common';

import { OrganizationsModule } from '../../organizations/presentation/organizations.module';
import { OnboardingService } from '../application/onboarding.service';
import { OnboardingRepository } from '../infrastructure/onboarding.repository';
import { OnboardingController } from './onboarding.controller';

/**
 * Imports OrganizationsModule for the one thing it must not re-implement:
 * "which organization is this user's". A second copy of that lookup is a
 * second answer waiting to disagree with the first.
 */
@Module({
  imports: [OrganizationsModule],
  controllers: [OnboardingController],
  providers: [OnboardingRepository, OnboardingService],
})
export class OnboardingModule {}
