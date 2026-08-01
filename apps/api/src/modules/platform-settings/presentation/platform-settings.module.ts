import { Module } from '@nestjs/common';

import { PlatformSettingsRepository } from '../infrastructure/platform-settings.repository';
import { PlatformSettingsController } from './platform-settings.controller';

@Module({
  controllers: [PlatformSettingsController],
  providers: [PlatformSettingsRepository],
})
export class PlatformSettingsModule {}
