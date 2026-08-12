import { Injectable } from '@nestjs/common';

import type { UploadableImageType } from '@amolie/shared-kernel';

import { buildMediaObjectPath } from '../domain/media-object-path';
import {
  SupabaseStorageClient,
  type SignedUpload,
} from '../infrastructure/supabase-storage.client';

/**
 * Hands out permission to upload exactly one image, into exactly one place.
 *
 * The signature is the whole point: the caller says what kind of image it is
 * and the server decides where it goes, so a master can never name a path
 * inside another organization's prefix. Nothing is written to the database
 * here — an upload only becomes part of the page when the Studio saves the
 * design that refers to it, which keeps an abandoned upload a stray object
 * rather than a broken page.
 */
@Injectable()
export class MediaUploadsService {
  constructor(private readonly storage: SupabaseStorageClient) {}

  createImageUpload(
    organizationId: string,
    contentType: UploadableImageType,
  ): Promise<SignedUpload> {
    return this.storage.createSignedUpload(
      buildMediaObjectPath(organizationId, contentType),
      contentType,
    );
  }
}
