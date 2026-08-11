import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

export class UpsertServiceCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(FIELD_LIMITS.name)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateServiceCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(FIELD_LIMITS.name)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderServiceCategoriesDto {
  /**
   * Capped like every other client-supplied list: the handler writes one
   * statement per id, so an unbounded array is an unbounded transaction. No
   * menu has two hundred groups.
   */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}
