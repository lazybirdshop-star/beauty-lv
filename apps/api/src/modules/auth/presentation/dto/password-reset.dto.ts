import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/** Длина токена задана нами: 32 случайных байта в base64url — 43 символа. */
const TOKEN_LENGTH = 43;

export class RequestPasswordResetDto {
  @IsEmail({}, { message: 'Укажите корректный email' })
  @MaxLength(320)
  email!: string;
}

export class ConfirmPasswordResetDto {
  @IsString()
  @MinLength(TOKEN_LENGTH)
  @MaxLength(TOKEN_LENGTH)
  token!: string;

  /** Тот же пол, что и при регистрации: правило одно на все точки входа. */
  @IsString()
  @MinLength(8, { message: 'Пароль не короче 8 символов' })
  @MaxLength(128)
  password!: string;
}

export class VerifyEmailDto {
  @IsString()
  @MinLength(TOKEN_LENGTH)
  @MaxLength(TOKEN_LENGTH)
  token!: string;
}
