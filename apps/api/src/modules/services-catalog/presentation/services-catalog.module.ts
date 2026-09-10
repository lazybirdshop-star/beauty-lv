import { Module } from '@nestjs/common';

import { ServiceAddonsRepository } from '../infrastructure/service-addons.repository';
import { ServiceCategoriesRepository } from '../infrastructure/service-categories.repository';
import { ServicesRepository } from '../infrastructure/services.repository';
import { StaffServicesRepository } from '../infrastructure/staff-services.repository';
import { ServiceCategoriesController } from './service-categories.controller';
import { ServicesController } from './services.controller';

@Module({
  controllers: [ServicesController, ServiceCategoriesController],
  providers: [
    ServicesRepository,
    ServiceCategoriesRepository,
    ServiceAddonsRepository,
    StaffServicesRepository,
  ],
  exports: [
    ServicesRepository,
    ServiceCategoriesRepository,
    ServiceAddonsRepository,
    StaffServicesRepository,
  ],
})
export class ServicesCatalogModule {}
