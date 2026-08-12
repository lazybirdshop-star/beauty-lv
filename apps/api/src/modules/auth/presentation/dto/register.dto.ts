import { IsEmail, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { USER_LOCALES } from '@amolie/shared-kernel';

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

  /**
   * Телефон обязателен: это второй канал связи с мастером и единственный,
   * который работает, когда письмо ушло в спам. Форма проверяется мягко —
   * плюс, цифры и разделители, — потому что строгий шаблон под латвийские,
   * литовские и российские номера сразу отверг бы часть настоящих.
   */
  @Matches(/^\+?[\d\s()-]{6,}$/, { message: 'Укажите телефон в международном формате' })
  @MaxLength(FIELD_LIMITS.phone)
  phone!: string;

  /** Язык кабинета и, что важнее, язык писем — выбирается сразу. */
  @IsIn(USER_LOCALES, { message: 'Выберите язык' })
  locale!: string;

  @IsString()
  @MinLength(8, { message: 'Пароль должен быть не короче 8 символов' })
  @MaxLength(FIELD_LIMITS.password)
  password!: string;
}
