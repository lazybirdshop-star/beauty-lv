import { Module } from '@nestjs/common';

import { ServiceAddonsRepository } from '../infrastructure/service-addons.repository';
import { ServiceCategoriesRepository } from '../infrastructure/service-categories.repository';
import { ServicesRepository } from '../infrastructure/services.repository';
import { ServiceCategoriesController } from './service-categories.controller';
import { ServicesController } from './services.controller';

@Module({
  controllers: [ServicesController, ServiceCategoriesController],
  providers: [ServicesRepository, ServiceCategoriesRepository, ServiceAddonsRepository],
  exports: [ServicesRepository, ServiceCategoriesRepository, ServiceAddonsRepository],
})
export class ServicesCatalogModule {}
