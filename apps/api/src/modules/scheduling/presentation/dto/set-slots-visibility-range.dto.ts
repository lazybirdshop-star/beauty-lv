import { IsBoolean, IsISO8601 } from 'class-validator';

/**
 * Отрезок, на котором окна скрываются или возвращаются.
 *
 * Обе границы обязательны по той же причине, что и у снятия периодом
 * (`DeleteSlotsRangeDto`): умолчание «всё» здесь означало бы, что мастер,
 * ничего не выбрав, убирает со страницы весь свой календарь.
 */
export class SetSlotsVisibilityRangeDto {
  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;

  @IsBoolean()
  hidden!: boolean;
}
