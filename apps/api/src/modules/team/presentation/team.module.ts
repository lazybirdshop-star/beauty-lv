import { Module } from '@nestjs/common';

import { AdminAnalyticsModule } from '../../admin-analytics/presentation/admin-analytics.module';
import { AuthModule } from '../../auth/presentation/auth.module';
import { ResendClient } from '../../notifications/infrastructure/resend.client';
import { ServicesCatalogModule } from '../../services-catalog/presentation/services-catalog.module';
import { TeamInvitesService } from '../application/team-invites.service';
import { TeamService } from '../application/team.service';
import { InvitesRepository } from '../infrastructure/invites.repository';
import { TeamAccountRepository } from '../infrastructure/team-account.repository';
import { TeamRepository } from '../infrastructure/team.repository';
import { TeamInvitesController } from './team-invites.controller';
import { TeamController } from './team.controller';

@Module({
  /* Почтовый клиент — провайдером, а не импортом модуля уведомлений: тот
     собирает push и письма о записях, а здесь нужен один отправитель. Тот же
     приём в `AuthModule` и `RegistrationModule`. */
  imports: [AdminAnalyticsModule, AuthModule, ServicesCatalogModule],
  controllers: [TeamController, TeamInvitesController],
  providers: [
    TeamService,
    TeamInvitesService,
    TeamRepository,
    InvitesRepository,
    TeamAccountRepository,
    ResendClient,
  ],
  exports: [TeamRepository],
})
export class TeamModule {}
