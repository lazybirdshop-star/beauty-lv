import { IsString, MaxLength, MinLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(FIELD_LIMITS.password)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(FIELD_LIMITS.password)
  newPassword!: string;
}
