import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

export class LoginDto {
  @IsEmail()
  @MaxLength(FIELD_LIMITS.email)
  email!: string;

  /**
   * No minimum beyond "present": the length of a *correct* password is not
   * this route's business, and rejecting a short one here would tell a caller
   * their guess was too short to be worth trying. The maximum is a different
   * matter — it stops an unauthenticated caller from handing argon2 a
   * megabyte to hash.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(FIELD_LIMITS.password)
  password!: string;
}
