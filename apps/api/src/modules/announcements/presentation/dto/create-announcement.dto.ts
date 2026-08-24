import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(3)
  @MaxLength(FIELD_LIMITS.name)
  title!: string;

  @IsString()
  @MinLength(10, { message: 'Объявление в три слова мастер прочитает как обрывок' })
  @MaxLength(FIELD_LIMITS.longText)
  body!: string;

  /** Не указано — показывать сразу: объявление пишут, когда оно нужно. */
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  /**
   * Не указано — показывать, пока не снимут руками.
   *
   * Отрезок времени вместо флага «опубликовано» намеренно: объявление про
   * завтрашнее обновление обязано исчезнуть послезавтра само, а флаг требует,
   * чтобы кто-то не забыл его снять.
   */
  @IsOptional()
  @IsISO8601()
  endsAt?: string;
}
