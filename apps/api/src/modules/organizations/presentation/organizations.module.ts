import { Module } from '@nestjs/common';

import { BookingModule } from '../../booking/presentation/booking.module';
import { ClientsModule } from '../../clients/presentation/clients.module';
import { SchedulingModule } from '../../scheduling/presentation/scheduling.module';
import { ServicesCatalogModule } from '../../services-catalog/presentation/services-catalog.module';
import { OrganizationsRepository } from '../infrastructure/organizations.repository';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [ServicesCatalogModule, SchedulingModule, BookingModule, ClientsModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsRepository],
})
export class OrganizationsModule {}
