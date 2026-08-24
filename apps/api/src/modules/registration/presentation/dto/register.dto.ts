import { USER_LOCALES } from '@amolie/shared-kernel';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

/**
 * Заявка на регистрацию — и она же форма открытой регистрации.
 *
 * Поля одинаковые в обоих режимах намеренно: человек заполняет форму один
 * раз, а решает платформа. Кода приглашения здесь больше нет.
 */
export class RegisterDto {
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

  /**
   * Что мастер рассказывает о себе — единственное, по чему заявку и разбирают.
   *
   * Необязательное: требовать сочинение от человека, который просто хочет
   * работать, значит отсеивать не тех. В открытом режиме поле не показывается
   * вовсе и просто игнорируется.
   */
  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.longText)
  message?: string;
}
