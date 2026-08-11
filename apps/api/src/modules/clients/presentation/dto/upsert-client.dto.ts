import { IsIn, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

export class UpsertClientDto {
  @IsString()
  @MinLength(2)
  @MaxLength(FIELD_LIMITS.name)
  fullName!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(FIELD_LIMITS.phone)
  phone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(FIELD_LIMITS.email)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.handle)
  instagramHandle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.longText)
  notes?: string;

  @IsOptional()
  @IsIn(['attention', 'favourite'])
  flag?: string | null;
}
