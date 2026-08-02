import { Module } from '@nestjs/common';

import { ServiceCategoriesRepository } from '../infrastructure/service-categories.repository';
import { ServicesRepository } from '../infrastructure/services.repository';
import { ServiceCategoriesController } from './service-categories.controller';
import { ServicesController } from './services.controller';

@Module({
  controllers: [ServicesController, ServiceCategoriesController],
  providers: [ServicesRepository, ServiceCategoriesRepository],
  exports: [ServicesRepository, ServiceCategoriesRepository],
})
export class ServicesCatalogModule {}
