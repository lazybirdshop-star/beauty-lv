import { IsIn, IsInt, Max, Min } from 'class-validator';

import {
  MAX_UPLOAD_BYTES,
  UPLOADABLE_IMAGE_TYPES,
  type UploadableImageType,
} from '@amolie/shared-kernel';

export class CreateImageUploadDto {
  /**
   * Decides both the stored extension and what Storage will accept, so it is
   * checked against the shared list rather than trusted as a string.
   */
  @IsIn(UPLOADABLE_IMAGE_TYPES, { message: 'Такой формат изображения не поддерживается' })
  contentType!: UploadableImageType;

  /**
   * Declared up front so an oversized file is refused before a URL is signed
   * rather than after the master has spent her traffic uploading it. The
   * bucket enforces the same ceiling, so a lie here buys nothing.
   */
  @IsInt()
  @Min(1)
  @Max(MAX_UPLOAD_BYTES, { message: 'Файл слишком большой' })
  byteSize!: number;
}
