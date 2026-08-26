import { Module } from '@nestjs/common';

import { AdminAnalyticsModule } from '../../admin-analytics/presentation/admin-analytics.module';
import { BookingModule } from '../../booking/presentation/booking.module';
import { ClientsModule } from '../../clients/presentation/clients.module';
import { SchedulingModule } from '../../scheduling/presentation/scheduling.module';
import { ServicesCatalogModule } from '../../services-catalog/presentation/services-catalog.module';
import { OrganizationSlugService } from '../application/organization-slug.service';
import { OrganizationsService } from '../application/organizations.service';
import { PublicProfileService } from '../application/public-profile.service';
import { OrganizationSlugRepository } from '../infrastructure/organization-slug.repository';
import { OrganizationsRepository } from '../infrastructure/organizations.repository';
import { PageDesignRepository } from '../infrastructure/page-design.repository';
import { OrganizationsController } from './organizations.controller';
import { PageDesignController } from './page-design.controller';

@Module({
  imports: [
    ServicesCatalogModule,
    SchedulingModule,
    BookingModule,
    ClientsModule,
    AdminAnalyticsModule,
  ],
  /* Порядок важен: `:slug/page-design` обязан быть зарегистрирован до
     `:slug`-маршрутов публичного контроллера, иначе тот перехватит адрес
     как имя мастера. */
  controllers: [PageDesignController, OrganizationsController],
  providers: [
    OrganizationsRepository,
    OrganizationSlugRepository,
    PageDesignRepository,
    OrganizationsService,
    OrganizationSlugService,
    PublicProfileService,
  ],
  /* Onboarding resolves "my organization" through OrganizationsRepository
     rather than keeping a second copy of that query. */
  exports: [OrganizationsRepository],
})
export class OrganizationsModule {}
