import { Module } from '@nestjs/common';

import { ServicesRepository } from '../infrastructure/services.repository';
import { ServicesController } from './services.controller';

@Module({
  controllers: [ServicesController],
  providers: [ServicesRepository],
})
export class ServicesCatalogModule {}
