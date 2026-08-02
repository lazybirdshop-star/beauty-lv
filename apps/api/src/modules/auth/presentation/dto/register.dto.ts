import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  /** Normalized (`normalizeInviteCode`) before it reaches here, so the strict shape is safe. */
  @Matches(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/, { message: 'Код приглашения указан неверно' })
  code!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Пароль должен быть не короче 8 символов' })
  password!: string;
}
