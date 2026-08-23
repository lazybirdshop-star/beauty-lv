import { IsOptional, IsString, MaxLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

/**
 * Причина отмены необязательна — и останется такой.
 *
 * Требовать её значило бы поставить между человеком и кнопкой форму, которую
 * он заполнит наугад: правдивый ответ «передумал» и вежливый «заболел» стоят
 * мастеру одинаково, а вот необъяснённая отмена вовремя — лучше объяснённой
 * поздно. Поле есть для тех, кто сам хочет что-то сказать.
 */
export class CancelPublicBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.shortText)
  reason?: string;
}
