import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

export class RegisterDto {
  /** Normalized (`normalizeInviteCode`) before it reaches here, so the strict shape is safe. */
  @Matches(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/, { message: 'Код приглашения указан неверно' })
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(FIELD_LIMITS.name)
  fullName!: string;

  @IsEmail()
  @MaxLength(FIELD_LIMITS.email)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Пароль должен быть не короче 8 символов' })
  @MaxLength(FIELD_LIMITS.password)
  password!: string;
}
