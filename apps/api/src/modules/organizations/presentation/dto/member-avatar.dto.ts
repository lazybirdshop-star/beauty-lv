import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

class FocalPointDto {
  @IsInt()
  @Min(0)
  @Max(100)
  x!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  y!: number;
}

export class UpdateMemberAvatarDto {
  /**
   * Проверяется здесь только как строка: что считать законной ссылкой на
   * изображение, решает `sanitizeMedia` в `shared-kernel` — тот же судья, что
   * и у медиа страницы. Второе описание того же правила декораторами разошлось
   * бы с первым, и разошлось бы молча.
   */
  @IsString()
  url!: string;

  /** Необязательна: снимок без точки кадрирования держится по центру. */
  @IsOptional()
  @ValidateNested()
  @Type(() => FocalPointDto)
  focal?: FocalPointDto;
}
