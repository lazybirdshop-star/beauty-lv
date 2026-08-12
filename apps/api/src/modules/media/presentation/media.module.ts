import { Module } from '@nestjs/common';

import { MediaUploadsService } from '../application/media-uploads.service';
import { SupabaseStorageClient } from '../infrastructure/supabase-storage.client';

import { MediaController } from './media.controller';

@Module({
  controllers: [MediaController],
  providers: [MediaUploadsService, SupabaseStorageClient],
})
export class MediaModule {}
