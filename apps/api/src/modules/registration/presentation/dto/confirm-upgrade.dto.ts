import { IsString, MaxLength, MinLength } from 'class-validator';

/** Длина токена задана нами: 32 случайных байта в base64url — 43 символа. */
const TOKEN_LENGTH = 43;

/** Ссылка из письма об одобрении — единственное, что нужно для повышения. */
export class ConfirmUpgradeDto {
  @IsString()
  @MinLength(TOKEN_LENGTH)
  @MaxLength(TOKEN_LENGTH)
  token!: string;
}
