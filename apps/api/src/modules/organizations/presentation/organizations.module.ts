import { Module } from '@nestjs/common';

import { OrganizationsRepository } from '../infrastructure/organizations.repository';
import { OrganizationsController } from './organizations.controller';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsRepository],
})
export class OrganizationsModule {}
