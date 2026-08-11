import { Module } from '@nestjs/common';

import { BookingModule } from '../../booking/presentation/booking.module';
import { ClientsModule } from '../../clients/presentation/clients.module';
import { SchedulingModule } from '../../scheduling/presentation/scheduling.module';
import { ServicesCatalogModule } from '../../services-catalog/presentation/services-catalog.module';
import { OrganizationsService } from '../application/organizations.service';
import { PublicProfileService } from '../application/public-profile.service';
import { OrganizationsRepository } from '../infrastructure/organizations.repository';
import { PageDesignRepository } from '../infrastructure/page-design.repository';
import { OrganizationsController } from './organizations.controller';
import { PageDesignController } from './page-design.controller';

@Module({
  imports: [ServicesCatalogModule, SchedulingModule, BookingModule, ClientsModule],
  /* Порядок важен: `:slug/page-design` обязан быть зарегистрирован до
     `:slug`-маршрутов публичного контроллера, иначе тот перехватит адрес
     как имя мастера. */
  controllers: [PageDesignController, OrganizationsController],
  providers: [
    OrganizationsRepository,
    PageDesignRepository,
    OrganizationsService,
    PublicProfileService,
  ],
})
export class OrganizationsModule {}
