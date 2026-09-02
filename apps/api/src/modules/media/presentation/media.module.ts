import { Module } from '@nestjs/common';

import { MediaUploadsService } from '../application/media-uploads.service';
import { SupabaseStorageClient } from '../infrastructure/supabase-storage.client';

import { MediaController } from './media.controller';

@Module({
  controllers: [MediaController],
  providers: [MediaUploadsService, SupabaseStorageClient],
  /* Портрет участника грузится со своего маршрута и под своим правилом
     доступа (см. `MembersController`), но подписывает ссылку тот же сервис:
     второй выдаватель прав на запись в хранилище — вторая дыра. */
  exports: [MediaUploadsService],
})
export class MediaModule {}
