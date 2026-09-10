import { USER_LOCALES } from '@amolie/shared-kernel';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

/**
 * Приём приглашения.
 *
 * Все поля необязательны: у человека с аккаунтом их спрашивать не за что —
 * он просто подтверждает, что идёт работать в этот салон. Обязательными они
 * становятся на сервере в той ветке, где аккаунт заводится (`accept`), и
 * отказ там говорит об этом прямо.
 */
export class AcceptInviteDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(FIELD_LIMITS.name)
  fullName?: string;

  @IsOptional()
  @Matches(/^\+?[\d\s()-]{6,}$/, { message: 'Укажите телефон в международном формате' })
  @MaxLength(FIELD_LIMITS.phone)
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Пароль должен быть не короче 8 символов' })
  @MaxLength(FIELD_LIMITS.password)
  password?: string;

  @IsOptional()
  @IsIn(USER_LOCALES, { message: 'Выберите язык' })
  locale?: string;
}
