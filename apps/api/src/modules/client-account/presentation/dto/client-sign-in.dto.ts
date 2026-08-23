import { USER_LOCALES } from '@amolie/shared-kernel';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

/** Длина токена задана нами: 32 случайных байта в base64url — 43 символа. */
const TOKEN_LENGTH = 43;

/**
 * Ссылку просят одним из двух способов, и оба ведут в одно место: со страницы
 * своей записи («запомнить меня») или с формы входа, где человек вводит адрес
 * сам. Первый способ знает запись, но может не знать адреса; второй —
 * наоборот. Требовать оба значило бы отсечь ровно тех, кто пришёл впервые.
 */
export class RequestClientSignInDto {
  @IsOptional()
  @IsEmail({}, { message: 'Укажите корректный email' })
  @MaxLength(FIELD_LIMITS.email)
  email?: string;

  /** Секретный токен записи — тот же, по которому открывается её статус. */
  @IsOptional()
  @IsUUID()
  publicToken?: string;

  /** Язык страницы, с которой пришли: письмо уходит до того, как аккаунт выбрал свой. */
  @IsOptional()
  @IsIn(USER_LOCALES)
  locale?: string;
}

export class ConfirmClientSignInDto {
  @IsString()
  @MinLength(TOKEN_LENGTH)
  @MaxLength(TOKEN_LENGTH)
  token!: string;
}
